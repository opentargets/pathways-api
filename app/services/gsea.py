from dataclasses import dataclass

import blitzgsea as blitz
import duckdb
import polars as pl
from loguru import logger

from app.models.gsea import (
    GeneSetLibraryEnum,
    GSEADirectionEnum,
    GseaJsonResponse,
    GseaResult,
    OverlapStats,
)

PATHWAY_LINK_MAP: dict[GeneSetLibraryEnum, str] = {
    GeneSetLibraryEnum.GOBiologicalProcess2025: "https://www.ebi.ac.uk/QuickGO/term/",
    GeneSetLibraryEnum.GOMolecularFunction2025: "https://www.ebi.ac.uk/QuickGO/term/",
    GeneSetLibraryEnum.GOCellularComponent2025: "https://www.ebi.ac.uk/QuickGO/term/",
    GeneSetLibraryEnum.Reactome2025: "https://reactome.org/content/detail/",
    GeneSetLibraryEnum.ChEMBLTargetClass: "https://www.ebi.ac.uk/chembl/visualise",
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


def load_library_data(
    con: duckdb.DuckDBPyConnection, library: GeneSetLibraryEnum
) -> LibraryData:
    """Load and precompute all data for a library. Called once at startup per library."""
    id_gene_result = con.execute(
        "SELECT gene_sets FROM libraries WHERE library = ?", [library.value]
    ).fetchone()
    id_gene_mapping: dict[str, list[str]] = id_gene_result[0] if id_gene_result else {}

    background_result = con.execute(
        "SELECT genes FROM background WHERE library = ?", [library.value]
    ).fetchone()
    background_genes = frozenset(background_result[0] if background_result else [])

    term_mapping = con.execute(
        "SELECT id, pathway FROM id_pathway_mapping WHERE library = ?", [library.value]
    ).pl()

    hierarchy = con.execute(
        "SELECT parent, child FROM hierarchy WHERE library = ?", [library.value]
    ).pl()

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

        result = blitz.gsea(df, library_data.id_gene_mapping, max_workers=max_workers)
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


def get_approved_symbols(con: duckdb.DuckDBPyConnection) -> pl.Series:
    logger.info("Loading approved symbols")
    symbols = (
        con.execute("SELECT approvedSymbol FROM approved_symbols").pl().to_series()
    )
    logger.info("Loaded {} approved symbols", len(symbols))
    return symbols


def get_libraries() -> list[str]:
    return [lib.value for lib in GeneSetLibraryEnum]
