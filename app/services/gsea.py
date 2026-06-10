import hashlib
import json
import threading
from collections import OrderedDict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import blitzgsea as blitz
import duckdb
import pandas as pd
import polars as pl
from loguru import logger

from app.models import GeneSetLibraryEnum, GseaJsonResponse
from app.models.gsea import GSEADirectionEnum


class GSEAException(Exception):
    """Custom exception for GSEA errors."""


class GSEA:
    def __init__(
        self,
        df: pl.DataFrame,
    ):
        self._df = df

    def normalise(self) -> pl.DataFrame:
        """
        Normalise a DataFrame for GSEA analysis.

        Args:
            df: Input DataFrame to validate

        Returns:
            Normalized DataFrame with 'symbol' and 'globalScore' columns, sorted by score
        """
        # Extract only required columns and sort
        return self._df.select(["symbol", "globalScore"]).sort(
            "globalScore", descending=True
        )

    def run(
        self,
        gmt_name: GeneSetLibraryEnum,
        approved_symbols: set[str],
        analysis_direction: GSEADirectionEnum = GSEADirectionEnum.OneSidedPositive,
        processes: int = 4,
    ) -> GseaJsonResponse:
        normalised_df = self.normalise()
        

    def _compute_cache_key(self, gmt_name: str) -> str:
        sorted_genes = (
            self._df.select(["symbol", "globalScore"]).sort(by="symbol").to_dicts()
        )
        key_data = json.dumps({gmt_name: sorted_genes})
        return hashlib.sha256(key_data.encode()).hexdigest()


MIN_GENE_COL_IDX = 1

# --- Caches ---
# _approved_symbols_cache: set[str] | None = None
# _approved_symbols_lock = threading.Lock()

_GSEA_CACHE_MAX_SIZE = 50
_gsea_cache: OrderedDict[str, tuple[pl.DataFrame, dict]] = OrderedDict()
_gsea_cache_lock = threading.Lock()


def _compute_cache_key(df: pl.DataFrame, gmt_name: str) -> str:
    sorted_genes = df.select(["symbol", "globalScore"]).sort(by="symbol").to_dicts()
    key_data = json.dumps({gmt_name: sorted_genes})
    return _sha256(key_data.encode())


@lru_cache(maxsize=128)
def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# def _compute_cache_key(df: pd.DataFrame, gmt_name: str) -> str:
#     sorted_genes = sorted(
#         ([str(s), float(sc)] for s, sc in df[["symbol", "globalScore"]].values),
#         key=lambda x: x[0],
#     )
#     key_data = json.dumps({"genes": sorted_genes, "gmt": gmt_name}, sort_keys=True)
#     return hashlib.sha256(key_data.encode()).hexdigest()


# class AppStateData:
#     BASE_DIR = Path(__file__).resolve().parents[1]
#     DATABASE_PATH = BASE_DIR / "data" / "pathways.db"

#     def __init__(self):
#         self.approved_symbols: set[str] = self._load_approved_symbols()
#         self.background_symbols: set[str] = self._load_background_symbols()
#         self.gene_set_library: dict[str, list[str]] = self._load_gene_set_library()
#         self.hierarchy: pl.DataFrame = self._load_hierarchy()

#     def _load_approved_symbols(self) -> set[str]:
#         with duckdb.connect(self.DATABASE_PATH) as con:
#             return set(
#                 con.sql("SELECT * FROM approved_symbols")
#                 .pl()
#                 .select("approvedSymbol")
#                 .to_series()
#                 .to_list()
#             )

#     def _load_background_symbols(self) -> set[str]:


def get_approved_symbols(database_path: Path) -> set[str]:
    """
    Returns a set of approved gene symbols.
    """
    with duckdb.connect(database_path) as con:
        approved_symbols = set(
            con.sql("SELECT * FROM approved_symbols")
            .pl()
            .select("approvedSymbol")
            .to_series()
            .to_list()
        )
    return approved_symbols


def get_libraries() -> list[str]:
    return [lib.value for lib in GeneSetLibraryEnum]


@lru_cache(maxsize=128)
def load_custom_gmt(path: Path) -> dict[str, list[str]]:
    with path.open("r") as f:
        return {
            parts[0]: parts[MIN_GENE_COL_IDX:]
            for line in f
            if (parts := line.strip().split("\t")) and len(parts) > MIN_GENE_COL_IDX
        }


@dataclass
class GMTFiles:
    gmt: Path
    hierarchy: Path | None = None


@lru_cache(maxsize=128)
def available_gmt_files() -> dict[str, GMTFiles]:
    """
    Return available GMT libraries as:
    {
        "Reactome/reactome2022": {"gmt": Path(...), "hierarchy": Path(...)},
        ...
    }
    """
    libraries = {}
    BASE_DIR = Path(__file__).resolve().parents[1]  # app/
    DATA_DIR = BASE_DIR / "data"
    GMT_DIR = DATA_DIR / "gmt"
    # Collect all folders first
    folders = [f for f in GMT_DIR.iterdir() if f.is_dir()]

    # Sort folders: Reactome first, then others alphabetically
    def sort_key(folder):
        if folder.name.startswith("Reactome"):
            return (0, folder.name)
        return (1, folder.name)

    folders.sort(key=sort_key)

    # Build libraries dictionary in sorted order
    for folder in folders:
        gmt_files = list(folder.glob("*.gmt"))
        txt_files = list(folder.glob("*.txt"))
        if not gmt_files:
            continue
        gmt_file = gmt_files[0]
        hierarchy_file = txt_files[0] if txt_files else None
        libraries[f"{folder.name}/{gmt_file.stem}"] = GMTFiles(
            gmt=gmt_file, hierarchy=hierarchy_file
        )
    return libraries


@lru_cache(maxsize=128)
def _contains_braces(gmt_file: Path) -> bool:
    with gmt_file.open("r") as f:
        if "{" and "}" in f.read():
            return True
    return False


@lru_cache(maxsize=128)
def get_gmt_file(gmt_name: str) -> GMTFiles:
    gmt_parent = available_gmt_files().get(gmt_name)
    if gmt_parent:
        return gmt_parent
    raise ValueError(
        "Invalid gmt_name. Choose from: " + str(list(available_gmt_files().keys()))
    )


def clean_df(
    res_df: pl.DataFrame,
    contains_braces: bool,
    gmt_file: Path,
    id_to_genes: dict,
    hierarchy_file: Path | None,
) -> pl.DataFrame:
    if contains_braces:
        term_series = res_df["Term"]
        res_df = res_df.with_columns(
            ID=term_series.str.extract(r"\{([^}]+)\}").fill_null(""),
            Term=term_series.str.replace(r"\s*\{[^}]+\}", "").str.strip_chars(),
        )
    else:
        res_df = res_df.with_columns(ID=res_df["Term"])

    if "leading_edge" in res_df.columns:
        res_df = res_df.with_columns(
            leading_edge=res_df["leading_edge"].cast(pl.List(pl.String)).list.join(",")
        )

    # --- Dynamic link assignment ---
    if gmt_file.stem.startswith("GO"):
        res_df = res_df.with_columns(
            Link=pl.lit("https://www.ebi.ac.uk/QuickGO/term/") + res_df["ID"]
        )
    elif gmt_file.stem.startswith("Reactome"):
        res_df = res_df.with_columns(
            Link=pl.lit("https://reactome.org/content/detail/") + res_df["ID"]
        )
    else:
        res_df = res_df.with_columns(
            Link=pl.lit("https://www.ebi.ac.uk/chembl/visualise")
        )

    # --- Size = number of genes defined in GMT ---
    id_to_gene_count = {k: len(v) for k, v in id_to_genes.items()}
    res_df = res_df.with_columns(
        PathwaySize=pl.when(pl.col("ID").is_null() | (pl.col("ID") == ""))
        .then(0)
        .otherwise(pl.col("ID").replace(id_to_gene_count, default=0))
        .cast(pl.Int64),
        PathwayGenes=pl.when(pl.col("ID").is_null() | (pl.col("ID") == ""))
        .then(pl.lit(""))
        .otherwise(
            pl.col("ID").replace(
                {k: ",".join(v) for k, v in id_to_genes.items()}, default=""
            )
        ),
    )

    rename_map = {
        "Term": "Pathway",
        "es": "ES",
        "nes": "NES",
        "fdr": "FDR",
        "pval": "p-value",
        "sidak": "Sidak's p-value",
        "geneset_size": "Number of input genes",
        "leading_edge": "Leading edge genes",
        "PathwaySize": "Pathway size",
        "PathwayGenes": "Pathway genes",
    }
    res_df = res_df.rename(rename_map)

    # --- Load hierarchy mapping if available ---
    if hierarchy_file and hierarchy_file.exists():
        hierarchy_df = pl.read_csv(
            hierarchy_file,
            separator="\t",
            has_header=False,
            new_columns=["Parent pathway", "Child pathway"],
        )
        res_df = res_df.join(
            hierarchy_df, left_on="ID", right_on="Child pathway", how="left"
        )
        res_df = res_df.group_by(
            [
                "ID",
                "Link",
                "Pathway",
                "ES",
                "NES",
                "FDR",
                "p-value",
                "Sidak's p-value",
                "Number of input genes",
                "Leading edge genes",
                "Pathway size",
                "Pathway genes",
            ]
        ).agg(pl.col("Parent pathway").drop_nulls().unique().sort().str.join(","))
    else:
        res_df = res_df.with_columns(pl.lit("").alias("Parent pathway"))

    float_defaults = {
        "ES": 0.0,
        "NES": 0.0,
        "FDR": 1.0,
        "p-value": 1.0,
        "Sidak's p-value": 1.0,
        "Number of input genes": 0,
        "Pathway size": 0,
    }
    res_df = res_df.with_columns(
        [
            pl.col(col).fill_nan(val)
            for col, val in float_defaults.items()
            if col in res_df.columns  # safe guard for missing columns
        ]
    )

    # Ensure string columns are properly handled

    string_defaults = {
        "Leading edge genes": "",
        "Parent pathway": "",
    }
    res_df = res_df.with_columns(
        [
            pl.col(col).fill_null(val)
            for col, val in string_defaults.items()
            if col in res_df.columns  # safe guard for missing columns
        ]
    )
    return res_df


def blitzgsea(df: pd.DataFrame, library_sets: dict, processes: int = 4) -> pl.DataFrame:
    return pl.from_pandas(
        blitz.gsea(df, library_sets, processes=processes).reset_index(names="Term")
    )


def run_gsea_from_dataframe(
    df: pl.DataFrame,
    gmt_name: str,
    analysis_direction: GSEADirectionEnum = GSEADirectionEnum.OneSidedPositive,
    processes: int = 4,
) -> GseaJsonResponse:
    """
    Run GSEA using a DataFrame directly (no file required).
    Results are cached by input hash (genes + gmt_name) to avoid redundant computation.

    Args:
        df: DataFrame with 'symbol' and 'globalScore' columns, already validated
        gmt_name: Name of GMT library to use
        processes: Number of CPU processes

    Returns:
        Tuple of (DataFrame with GSEA results, overlap_stats dict)

    Raises:
        ValueError: If gmt_name is invalid or DataFrame is missing required columns
    """
    # Check cache before doing any work
    cache_key = _compute_cache_key(df, gmt_name)
    logger.info("Cache key: {}", cache_key)
    # with _gsea_cache_lock:
    #     if cache_key in _gsea_cache:
    #         _gsea_cache.move_to_end(cache_key)
    #         logger.info(
    #             "GSEA cache hit for key %s (library: %s)", cache_key[:12], gmt_name
    #         )
    #         cached_df, cached_overlap = _gsea_cache[cache_key]
    #         return cached_df.copy(), cached_overlap.copy()

    # logger.info(
    #     "GSEA cache miss for key %s (library: %s) — running analysis",
    #     cache_key[:12],
    #     gmt_name,
    # )

    # gmt_files = available_gmt_files()
    # if gmt_name not in gmt_files:
    #     msg = "Invalid gmt_name. Choose from: " + str(list(gmt_files.keys()))
    #     raise ValueError(msg)

    gmt_file = get_gmt_file(gmt_name).gmt
    hierarchy_file = get_gmt_file(gmt_name).hierarchy

    # load library sets (term -> genes list)
    library_sets = load_custom_gmt(gmt_file)

    # --- Check if GMT file contains IDs in braces {ID} ---
    contains_braces = _contains_braces(gmt_file)

    # Build ID -> genes mapping from the GMT file
    id_to_genes = {}
    with gmt_file.open("r") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) > MIN_GENE_COL_IDX:
                term = parts[0]
                genes = parts[MIN_GENE_COL_IDX:]
                if contains_braces and "{" in term and "}" in term:
                    start = term.find("{") + 1
                    end = term.find("}", start)
                    if end > start:
                        id_ = term[start:end]
                        id_to_genes[id_] = genes
                else:
                    # if no braces, map Term itself as ID
                    id_to_genes[term] = genes

    # Ensure DataFrame is properly formatted
    if not {"symbol", "globalScore"}.issubset(df.columns):
        raise ValueError("DataFrame must contain 'symbol' and 'globalScore' columns.")

    df = df.select(["symbol", "globalScore"])

    # --- Merge background genes for the selected library (no duplicates) ---
    # Prefer pre-generated background file next to the GMT; fallback to union from GMT
    background_path = gmt_file.with_name(f"{gmt_file.stem}_background")
    if background_path.exists():
        with background_path.open("r") as f:
            background_genes = {line.strip() for line in f if line.strip()}
    else:
        # Fallback: union of all genes from the GMT mapping
        background_genes = set()
        for genes in library_sets.values():
            background_genes.update(g for g in genes if g)

    # --- Calculate missing targets from input list vs library background ---
    symbols = df.select(pl.col("symbol").str.strip_chars()).drop_nulls().to_series()
    input_unique = set(symbols)
    total_input = len(input_unique)
    overlap_count = len(input_unique & background_genes)
    overlap_percent = round(
        (overlap_count / total_input * 100) if total_input else 0.0, 2
    )
    overlap_stats = {
        "library": gmt_name,
        "used_count": overlap_count,
        "total_input": total_input,
        "used_percent": overlap_percent,
    }

    missing_genes = sorted(background_genes - input_unique)
    if missing_genes:
        background_df = pl.DataFrame(
            {
                "symbol": missing_genes,
                "globalScore": 0.0,
            }
        )
        df = pl.concat([df, background_df])

    # --- Filter genes to only include those in Open Targets approved symbols ---
    approved_symbols = get_approved_symbols()
    df: pl.DataFrame = (
        df.filter(pl.col("symbol").is_in(approved_symbols))
        .sort(pl.col("globalScore"), descending=True, nulls_last=True)
        .unique(subset=["symbol"], keep="first", maintain_order=True)
    )

    res_df = blitzgsea(df.to_pandas(), library_sets, processes=processes)
    res_df = clean_df(res_df, contains_braces, gmt_file, id_to_genes, hierarchy_file)

    # Store in cache
    with _gsea_cache_lock:
        _gsea_cache[cache_key] = (res_df, overlap_stats)
        if len(_gsea_cache) > _GSEA_CACHE_MAX_SIZE:
            _gsea_cache.popitem(last=False)

    # Filter by NES based on analysis direction
    if analysis_direction is GSEADirectionEnum.OneSidedPositive:
        res_df = res_df.filter(pl.col("NES") > 0)
    elif analysis_direction is GSEADirectionEnum.OneSidedNegative:
        res_df = res_df.filter(pl.col("NES") < 0)
    res_df = res_df.fill_nan(None)
    results = GseaJsonResponse(
        results=res_df.to_dicts(),
        input_overlap=overlap_stats,
    )
    return results


def run_gsea(input_tsv: Path, gmt_name: str, processes=4):
    """
    Run GSEA from a TSV file path (backward compatible).

    Args:
        input_tsv: Path to TSV file with 'symbol' and 'globalScore' columns
        gmt_name: Name of GMT library to use
        processes: Number of CPU processes

    Returns:
        Tuple of (DataFrame with GSEA results, overlap_stats dict)

    Raises:
        ValueError: If gmt_name is invalid or file is missing required columns
    """
    if not input_tsv.is_file():
        raise ValueError("input_tsv parameter is required")

    # Load input file
    df = pl.read_csv(input_tsv, separator="\t")

    # Handle unnamed columns (legacy support)
    if set(df.columns) == set(range(len(df.columns))):
        df = df.rename({"0": "symbol", "1": "globalScore"})

    # Validate and run GSEA using the DataFrame-based function
    return run_gsea_from_dataframe(df, gmt_name, processes=processes)
