import hashlib
import json
import threading
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path

import blitzgsea as blitz
import duckdb
import numpy as np
import pandas as pd
import polars as pl
from loguru import logger


class GSEA:
    def __init__(self, df: pl.DataFrame):
        self.df = df

    def validated(self) -> pl.DataFrame:
        pass

    def analyse(self, gmt_name: str, processes: int = 4) -> pd.DataFrame:
        pass


MIN_GENE_COL_IDX = 2

# --- Caches ---
_approved_symbols_cache: set[str] | None = None
_approved_symbols_lock = threading.Lock()

_GSEA_CACHE_MAX_SIZE = 50
_gsea_cache: OrderedDict[str, tuple[pd.DataFrame, dict]] = OrderedDict()
_gsea_cache_lock = threading.Lock()


def _compute_cache_key(df: pl.DataFrame, gmt_name: str) -> str:
    sorted_genes = df.select(["symbol", "globalScore"]).sort(by="symbol").to_dicts()
    key_data = json.dumps({gmt_name: sorted_genes})
    return hashlib.sha256(key_data.encode()).hexdigest()


# def _compute_cache_key(df: pd.DataFrame, gmt_name: str) -> str:
#     sorted_genes = sorted(
#         ([str(s), float(sc)] for s, sc in df[["symbol", "globalScore"]].values),
#         key=lambda x: x[0],
#     )
#     key_data = json.dumps({"genes": sorted_genes, "gmt": gmt_name}, sort_keys=True)
#     return hashlib.sha256(key_data.encode()).hexdigest()


def get_approved_symbols() -> set[str]:
    """
    Read approvedSymbol column from Open Targets target parquet files in GCS using gcsfs.
    Returns a set of approved gene symbols. Result is cached for the lifetime of the process.
    """
    global _approved_symbols_cache
    with _approved_symbols_lock:
        # Double-check after acquiring lock
        if _approved_symbols_cache is not None:
            return _approved_symbols_cache

        with duckdb.connect(
            Path(__file__).resolve().parents[1] / "data" / "pathways.db"
        ) as con:
            approved_symbols = set(
                con.sql("SELECT * FROM approved_symbols")
                .pl()
                .select("approvedSymbol")
                .to_series()
                .to_list()
            )
        logger.info("extracting approved symbols")
        logger.info(
            "Fetched {} approved symbols from GCS (cached for instance lifetime)",
            len(approved_symbols),
        )
        _approved_symbols_cache = approved_symbols
        return approved_symbols


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


def _contains_braces(gmt_file: Path) -> bool:
    with gmt_file.open("r") as f:
        if "{" and "}" in f.read():
            return True
    return False


def get_gmt_file(gmt_name: str) -> GMTFiles:
    gmt_parent = available_gmt_files().get(gmt_name)
    if gmt_parent:
        return gmt_parent
    raise ValueError(
        "Invalid gmt_name. Choose from: " + str(list(available_gmt_files().keys()))
    )


def clean_df(
    res_df: pd.DataFrame,
    contains_braces: bool,
    gmt_file: Path,
    id_to_genes: dict,
    hierarchy_file: Path | None,
) -> pd.DataFrame:
    if contains_braces:
        term_series = res_df["Term"]
        res_df["ID"] = term_series.str.extract(r"\{([^}]+)\}", expand=False).fillna("")
        res_df["Term"] = term_series.str.replace(
            r"\s*\{[^}]+\}", "", regex=True
        ).str.strip()
    else:
        res_df["ID"] = res_df["Term"]  # use Term as ID directly

    if "leading_edge" in res_df.columns:
        res_df["leading_edge"] = res_df["leading_edge"].apply(
            lambda x: ",".join(x) if isinstance(x, (list, tuple)) else str(x)
        )

    # --- Dynamic link assignment ---
    if gmt_file.stem.startswith("GO"):
        res_df["Link"] = "https://www.ebi.ac.uk/QuickGO/term/" + res_df["ID"]
    elif gmt_file.stem.startswith("Reactome"):
        res_df["Link"] = "https://reactome.org/content/detail/" + res_df["ID"]
    else:
        res_df["Link"] = "https://www.ebi.ac.uk/chembl/visualise"

    # --- Size = number of genes defined in GMT ---
    res_df["Pathway size"] = res_df["ID"].map(
        lambda x: len(id_to_genes.get(x, [])) if pd.notna(x) and x != "" else 0
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
    }
    res_df = res_df.rename(columns=rename_map)

    # --- Load hierarchy mapping if available ---
    if hierarchy_file and hierarchy_file.exists():
        hierarchy_df = pd.read_csv(
            hierarchy_file,
            sep="\t",
            header=None,
            names=["Parent pathway", "Child pathway"],
        )
        res_df = res_df.merge(
            hierarchy_df, left_on="ID", right_on="Child pathway", how="left"
        )
        res_df = (
            res_df.groupby(
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
                ],
                dropna=False,
            )["Parent pathway"]
            .apply(lambda x: ",".join(sorted(set(x.dropna()))))
            .reset_index()
        )
    else:
        res_df["Parent pathway"] = ""

    def safe_int_col(df_, col_name):
        """
        Clean a column (remove commas, coerce non-numeric → NaN), fill NaN with 0, then convert to int.
        """
        if col_name in df_.columns:
            s = df_[col_name].astype(str).str.replace(",", "", regex=False).str.strip()
            s = s.replace({"": None, "nan": None})
            df_[col_name] = pd.to_numeric(s, errors="coerce").fillna(0).astype(int)

    safe_int_col(res_df, "Number of input genes")
    safe_int_col(res_df, "Pathway size")

    # Handle NaN values for JSON serialization
    res_df = res_df.replace([np.inf, -np.inf], np.nan)
    res_df = res_df.fillna(
        {
            "ES": 0.0,
            "NES": 0.0,
            "FDR": 1.0,
            "p-value": 1.0,
            "Sidak's p-value": 1.0,
            "Number of input genes": 0,
            "Pathway size": 0,
        }
    )

    # Ensure string columns are properly handled
    string_columns = ["Leading edge genes", "Parent pathway"]
    for col in string_columns:
        if col in res_df.columns:
            res_df[col] = res_df[col].astype(str).replace("nan", "")
    return res_df


def blitzgsea(df: pd.DataFrame, library_sets: dict, processes: int = 4) -> pd.DataFrame:
    return blitz.gsea(df, library_sets, processes=processes).reset_index(names="Term")


def run_gsea_from_dataframe(
    df: pl.DataFrame, gmt_name: str, processes: int = 4
) -> tuple[pd.DataFrame, dict]:
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

    # Sort by score desc and drop duplicate symbols keeping highest score (originals win over zeros)
    # pddf = pddf.sort_values("globalScore", ascending=False)
    # pddf = pddf.drop_duplicates(subset=["symbol"], keep="first")

    res_df = blitzgsea(df.to_pandas(), library_sets, processes=processes)
    logger.info(f"GSEA completed, results shape: {res_df.shape}")

    res_df = clean_df(res_df, contains_braces, gmt_file, id_to_genes, hierarchy_file)

    # Store in cache
    with _gsea_cache_lock:
        _gsea_cache[cache_key] = (res_df.copy(), overlap_stats.copy())
        if len(_gsea_cache) > _GSEA_CACHE_MAX_SIZE:
            _gsea_cache.popitem(last=False)

    return res_df, overlap_stats


def run_gsea(input_tsv=None, gmt_name=None, processes=4):
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
    if not input_tsv:
        raise ValueError("input_tsv parameter is required")

    input_tsv = Path(input_tsv)

    # Load input file
    df = pd.read_csv(input_tsv, sep="\t")

    # Handle unnamed columns (legacy support)
    if set(df.columns) == set(range(len(df.columns))):
        df = df.rename(columns={0: "symbol", 1: "globalScore"})

    # Validate and run GSEA using the DataFrame-based function
    return run_gsea_from_dataframe(df, gmt_name, processes)
