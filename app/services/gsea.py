from pathlib import Path
import numpy as np
import blitzgsea as blitz
import gcsfs
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
GMT_DIR = DATA_DIR / "gmt"
MIN_GENE_COL_IDX = 2

def get_approved_symbols_from_gcs():
    """
    Read approvedSymbol column from Open Targets target parquet files in GCS using gcsfs.
    Returns a set of approved gene symbols.
    """
    # Initialize GCS filesystem
    fs = gcsfs.GCSFileSystem()

    # Define the GCS path to the target directory
    gcs_path = "open-targets-pre-data-releases/25.09/output/target/"

    # Read all parquet files in the directory as a single dataset
    # This is much more efficient than downloading individual files
    df = pd.read_parquet(gcs_path, filesystem=fs, columns=["approvedSymbol"])

    # Extract unique approved symbols (excluding NaN values)
    approved_symbols = set(df["approvedSymbol"].dropna().astype(str))


    return approved_symbols


def load_custom_gmt(path):
    p = Path(path)
    with p.open("r") as f:
        return {
            parts[0]: parts[MIN_GENE_COL_IDX:]
            for line in f
            if (parts := line.strip().split("\t")) and len(parts) > MIN_GENE_COL_IDX
        }


def available_gmt_files():
    """
    Return available GMT libraries as:
    {
        "Reactome/reactome2022": {"gmt": Path(...), "hierarchy": Path(...)},
        ...
    }
    """
    libraries = {}
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
        libraries[f"{folder.name}/{gmt_file.stem}"] = {
            "gmt": gmt_file,
            "hierarchy": hierarchy_file,
        }
    return libraries


def run_gsea_from_dataframe(
    df: pd.DataFrame, gmt_name: str, processes: int = 4
) -> tuple[pd.DataFrame, dict]:
    """
    Run GSEA using a DataFrame directly (no file required).

    Args:
        df: DataFrame with 'symbol' and 'globalScore' columns, already validated
        gmt_name: Name of GMT library to use
        processes: Number of CPU processes

    Returns:
        Tuple of (DataFrame with GSEA results, overlap_stats dict)

    Raises:
        ValueError: If gmt_name is invalid or DataFrame is missing required columns
    """
    gmt_files = available_gmt_files()
    if not gmt_name or gmt_name not in gmt_files:
        msg = "Invalid gmt_name. Choose from: " + str(list(gmt_files.keys()))
        raise ValueError(msg)

    gmt_file = gmt_files[gmt_name]["gmt"]
    hierarchy_file = gmt_files[gmt_name]["hierarchy"]

    # load library sets (term -> genes list)
    library_sets = load_custom_gmt(gmt_file)

    # --- Check if GMT file contains IDs in braces {ID} ---
    contains_braces = False
    with gmt_file.open("r") as f:
        for line in f:
            if "{" in line and "}" in line:
                contains_braces = True
                break

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

    # Keep only required columns
    df = df[["symbol", "globalScore"]].copy()

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
    input_symbols = df["symbol"].astype(str).str.strip()
    input_symbols = input_symbols[input_symbols != ""]
    input_unique = set(input_symbols)
    total_input = len(input_unique)
    overlap_count = len(input_unique & background_genes)
    overlap_percent = round((overlap_count / total_input * 100) if total_input else 0.0, 2)
    overlap_stats = {
        "library": gmt_name,
        "used_count": overlap_count,
        "total_input": total_input,
        "used_percent": overlap_percent,
    }

    existing_genes = set(df["symbol"].astype(str))
    missing_genes = sorted(background_genes - existing_genes)
    if missing_genes:
        background_df = pd.DataFrame({
            "symbol": missing_genes,
            "globalScore": 0,
        })
        df = pd.concat([df, background_df], ignore_index=True)

    # --- Filter genes to only include those in Open Targets approved symbols ---
    approved_symbols = get_approved_symbols_from_gcs()
    df = df[df["symbol"].astype(str).isin(approved_symbols)].copy()

    # Sort by score desc and drop duplicate symbols keeping highest score (originals win over zeros)
    df = df.sort_values("globalScore", ascending=False)
    df = df.drop_duplicates(subset=["symbol"], keep="first")

    res_df = blitz.gsea(df, library_sets, processes=processes).reset_index(names="Term")

    # --- Extract IDs and clean terms ---
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
            hierarchy_file, sep="\t", header=None,
            names=["Parent pathway", "Child pathway"],
        )
        res_df = res_df.merge(
            hierarchy_df, left_on="ID", right_on="Child pathway", how="left"
        )
        res_df = (
            res_df.groupby(
                [
                    "ID", "Link", "Pathway", "ES", "NES", "FDR", "p-value",
                    "Sidak's p-value", "Number of input genes", "Leading edge genes", "Pathway size",
                ],
                dropna=False,
            )["Parent pathway"]
            .apply(lambda x: ",".join(sorted(set(x.dropna()))))
            .reset_index()
        )
    else:
        res_df["Parent pathway"] = ""

    # --- Final: ensure integer formatting for counts (no .0) ---
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
    res_df = res_df.fillna({
        'ES': 0.0,
        'NES': 0.0,
        'FDR': 1.0,
        'p-value': 1.0,
        "Sidak's p-value": 1.0,
        'Number of input genes': 0,
        'Pathway size': 0
    })

    # Ensure string columns are properly handled
    string_columns = ['Leading edge genes', 'Parent pathway']
    for col in string_columns:
        if col in res_df.columns:
            res_df[col] = res_df[col].astype(str).replace('nan', '')


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
