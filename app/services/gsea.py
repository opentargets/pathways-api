import threading
from dataclasses import dataclass

import blitzgsea as blitz
import polars as pl
from loguru import logger

from app.models.gsea import (
    GeneSetLibraryEnum,
    GSEADirectionEnum,
    GseaJsonResponse,
    GseaResult,
    OverlapStats,
)

# blitzgsea seeds the global numpy state, so parallel runs would change each other's scores
_blitz_lock = threading.Lock()

PATHWAY_LINK_MAP: dict[GeneSetLibraryEnum, str] = {
    GeneSetLibraryEnum.GOBiologicalProcess: "https://www.ebi.ac.uk/QuickGO/term/",
    GeneSetLibraryEnum.GOMolecularFunction: "https://www.ebi.ac.uk/QuickGO/term/",
    GeneSetLibraryEnum.GOCellularComponent: "https://www.ebi.ac.uk/QuickGO/term/",
    GeneSetLibraryEnum.Reactome: "https://reactome.org/content/detail/",
    GeneSetLibraryEnum.ChEMBLTargetClass: "https://www.ebi.ac.uk/chembl/visualise",
}

# Library -> category of its gene sets in the release
LIBRARY_CATEGORIES: dict[GeneSetLibraryEnum, str] = {
    GeneSetLibraryEnum.GOBiologicalProcess: "GO:BP",
    GeneSetLibraryEnum.GOMolecularFunction: "GO:MF",
    GeneSetLibraryEnum.GOCellularComponent: "GO:CC",
    GeneSetLibraryEnum.Reactome: "Reactome",
    GeneSetLibraryEnum.ChEMBLTargetClass: "ChEMBL Target Class",
}

NULL_DEFAULTS: dict[str, float | int | str] = {
    "es": 0.0,
    "nes": 0.0,
    "fdr": 1.0,
    "p_value": 1.0,
    "sidaks_p_value": 1.0,
    "geneset_size": 0,
    "pathway_size": 0,
    "parent_pathway": "",
}


@dataclass
class LibraryData:
    library: GeneSetLibraryEnum
    id_gene_mapping: dict[str, list[str]]
    background_genes: frozenset[str]
    lookup: pl.DataFrame  # id, pathway, pathway_size, pathway_genes, link
    hierarchy: pl.DataFrame  # parent, child


def load_targets(release_path: str) -> pl.DataFrame:
    """Ensembl ID, approved symbol and obsolete symbols of the targets of a release."""
    return (
        pl.scan_parquet(f"{release_path.rstrip('/')}/output/target/*.parquet")
        .select(
            "id",
            "approvedSymbol",
            pl.col("obsoleteSymbols").list.eval(pl.element().struct.field("label")),
        )
        .collect()
    )


def load_gene_sets(release_path: str) -> pl.DataFrame:
    """Gene sets of a release."""
    return (
        pl.scan_parquet(f"{release_path.rstrip('/')}/output/gene_sets/*.parquet")
        .select("id", "label", "category", "parentIds", "entityIds")
        .collect()
    )


def load_library_data(
    gene_sets: pl.DataFrame, targets: pl.DataFrame, library: GeneSetLibraryEnum
) -> LibraryData:
    """Precompute all data for a library. Called once at startup per library."""
    sets = gene_sets.filter(pl.col("category") == LIBRARY_CATEGORIES[library])
    if sets.is_empty():
        raise ValueError(f"No gene sets for {library.value}")

    symbols = dict(targets.select("id", "approvedSymbol").iter_rows())
    id_gene_mapping: dict[str, list[str]] = {
        id_: list(dict.fromkeys(symbols[gene] for gene in genes))
        for id_, genes in sets.select("id", "entityIds").iter_rows()
    }
    background_genes = frozenset(g for v in id_gene_mapping.values() for g in v)
    term_mapping = sets.select("id", pl.col("label").alias("pathway"))
    hierarchy = (
        sets.select(pl.col("parentIds").alias("parent"), pl.col("id").alias("child"))
        .explode("parent")
        .drop_nulls("parent")
    )

    gene_df = pl.DataFrame(
        {
            "id": list(id_gene_mapping.keys()),
            "pathway_size": pl.Series(
                [len(v) for v in id_gene_mapping.values()], dtype=pl.Int64
            ),
            "pathway_genes": list(id_gene_mapping.values()),
        }
    )

    lookup = term_mapping.join(gene_df, on="id", how="left")

    base_url = PATHWAY_LINK_MAP[library]
    link_expr = (
        pl.lit(base_url)
        if library is GeneSetLibraryEnum.ChEMBLTargetClass
        else pl.lit(base_url) + pl.col("id")
    )
    lookup = lookup.with_columns(link_expr.alias("link"))

    return LibraryData(
        library=library,
        id_gene_mapping=id_gene_mapping,
        background_genes=background_genes,
        lookup=lookup,
        hierarchy=hierarchy,
    )


class GSEAException(Exception):
    pass


class GSEA:
    def __init__(self, df: pl.DataFrame, validate: bool = True):
        if validate and not self._is_valid(df):
            raise GSEAException("Input data is not valid")
        self._df = df
        self._input_symbols: frozenset[str] = frozenset(
            df.select(pl.col("symbol").str.strip_chars()).drop_nulls().to_series()
        )

    @staticmethod
    def _is_valid(df: pl.DataFrame) -> bool:
        required = {"symbol", "globalScore"}
        if not required.issubset(df.columns):
            logger.error(
                "Input missing required columns: {}", required - set(df.columns)
            )
            return False
        numeric = {pl.Float32, pl.Float64, pl.Int8, pl.Int16, pl.Int32, pl.Int64}
        schema = df.schema
        return schema["symbol"] == pl.String and schema["globalScore"] in numeric

    def run(
        self,
        library_data: LibraryData,
        approved_symbols: pl.Series,
        analysis_direction: GSEADirectionEnum = GSEADirectionEnum.OneSidedPositive,
        max_workers: int | None = None,
    ) -> pl.DataFrame:
        df = self._df.select(["symbol", "globalScore"]).sort(
            "globalScore", descending=True
        )

        missing = sorted(library_data.background_genes - self._input_symbols)
        if missing:
            df = pl.concat([df, pl.DataFrame({"symbol": missing, "globalScore": 0.0})])

        df = (
            df.filter(pl.col("symbol").is_in(approved_symbols))
            .sort("globalScore", descending=True, nulls_last=True)
            .unique(subset=["symbol"], keep="first", maintain_order=True)
        )

        with _blitz_lock:
            result = blitz.gsea(df, library_data.id_gene_mapping)
        return _prepare_output(result, library_data, analysis_direction)

    def results(
        self,
        library_data: LibraryData,
        approved_symbols: pl.Series,
        analysis_direction: GSEADirectionEnum = GSEADirectionEnum.OneSidedPositive,
        max_workers: int | None = None,
    ) -> GseaJsonResponse:
        result_df = self.run(
            library_data, approved_symbols, analysis_direction, max_workers
        )

        overlap_count = len(self._input_symbols & library_data.background_genes)
        total_input = len(self._input_symbols)
        overlap_stats = OverlapStats(
            library=library_data.library,
            used_count=overlap_count,
            total_input=total_input,
            used_percent=round(
                (overlap_count / total_input * 100) if total_input else 0.0, 2
            ),
        )

        return GseaJsonResponse(
            results=[GseaResult.model_validate(row) for row in result_df.to_dicts()],
            input_overlap=overlap_stats,
        )


def _prepare_output(
    df: pl.DataFrame,
    library_data: LibraryData,
    analysis_direction: GSEADirectionEnum,
) -> pl.DataFrame:
    df = df.rename({"pval": "p_value", "sidak": "sidaks_p_value"}).with_columns(
        pl.col("Term").alias("id"),
        pl.col("leading_edge").str.split(","),
    )

    df = df.join(library_data.lookup, on="id", how="left").join(
        library_data.hierarchy, left_on="id", right_on="child", how="left"
    )

    group_cols = [
        "id",
        "link",
        "pathway",
        "es",
        "nes",
        "fdr",
        "p_value",
        "sidaks_p_value",
        "geneset_size",
        "leading_edge",
        "pathway_size",
        "pathway_genes",
    ]
    df = df.group_by(group_cols).agg(
        pl.col("parent")
        .drop_nulls()
        .unique()
        .sort()
        .str.join(",")
        .alias("parent_pathway")
    )

    df = df.with_columns(
        [pl.col(c).fill_null(v) for c, v in NULL_DEFAULTS.items() if c in df.columns]
        + [pl.col("pathway_genes").fill_null([])]
    )

    if analysis_direction is GSEADirectionEnum.OneSidedPositive:
        df = df.filter(pl.col("nes") > 0)
    elif analysis_direction is GSEADirectionEnum.OneSidedNegative:
        df = df.filter(pl.col("nes") < 0)

    return df.fill_nan(None)


def get_approved_symbols(targets: pl.DataFrame) -> pl.Series:
    return targets["approvedSymbol"].unique()


def get_symbols(targets: pl.DataFrame) -> dict[str, str]:
    """Approved symbol by Ensembl ID, and by obsolete symbol if it is of one target only."""
    obsolete = (
        targets.select(pl.col("obsoleteSymbols").alias("name"), "approvedSymbol")
        .explode("name")
        .unique()
        .filter(
            pl.col("name").is_not_null(),
            ~pl.col("name").is_duplicated(),
            ~pl.col("name").is_in(targets["approvedSymbol"].to_list()),
        )
    )
    ids = targets.select("id", "approvedSymbol")
    return dict(obsolete.iter_rows()) | dict(ids.iter_rows())


def with_symbols(df: pl.DataFrame, symbols: dict[str, str]) -> pl.DataFrame:
    """Input genes by approved symbol, found from their Ensembl `id`, or else `symbol`."""
    columns = [c for c in ("id", "symbol") if c in df.columns]
    if not columns:
        return df
    names = [pl.col(c).cast(pl.String).str.strip_chars() for c in columns]
    found = [n.replace_strict(symbols, default=None) for n in names]
    return df.with_columns(pl.coalesce(*found, *names[::-1]).alias("symbol"))


def get_libraries() -> list[str]:
    return [lib.value for lib in GeneSetLibraryEnum]
