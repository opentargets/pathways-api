import os
import pandas as pd
import blitzgsea as blitz
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
GMT_DIR = DATA_DIR / "gmt"

HIERARCHY_FILE = DATA_DIR / "gmt" / "Pathways_hierarchy_relationship.txt"

print(f"GMT files found: {list(GMT_DIR.glob('*.gmt'))}")

def load_custom_gmt(path):
    with open(path, 'r') as f:
        return {
            parts[0]: parts[2:]
            for line in f
            if (parts := line.strip().split('\t')) and len(parts) > 2
        }


def available_gmt_files():
    """Return available GMT files as {name: Path}"""
    return {f.stem: f for f in GMT_DIR.glob("*.gmt")}


def run_gsea(input_tsv=None, gmt_name=None, processes=4):
    """
    Run GSEA using a chosen GMT file name from available_gmt_files(),
    and perform post-processing steps (Reactome-style).
    """
    input_tsv = Path(input_tsv) if input_tsv else DEFAULT_TEST_INPUT

    gmt_files = available_gmt_files()
    if not gmt_name or gmt_name not in gmt_files:
        raise ValueError(f"Invalid gmt_name. Choose from: {list(gmt_files.keys())}")

    gmt_file = gmt_files[gmt_name]
    library_sets = load_custom_gmt(gmt_file)

    # --- Load input file safely ---
    df = pd.read_csv(input_tsv, sep="\t")

    # If no headers are present, pandas will assign numeric columns 0,1,...
    if set(df.columns) == set(range(len(df.columns))):
        df = df.rename(columns={0: "symbol", 1: "globalScore"})

    # Ensure required columns exist
    if not {"symbol", "globalScore"}.issubset(df.columns):
        raise ValueError("Input file must contain 'symbol' and 'globalScore' columns.")

    # Keep only the necessary columns
    df = df[["symbol", "globalScore"]].copy()
    df = df.sort_values("globalScore", ascending=False)

    res_df = blitz.gsea(df, library_sets, processes=processes).reset_index(names="Term")

    # --- Extract IDs and clean terms ---
    term_series = res_df["Term"]
    res_df["ID"] = term_series.str.extract(r"\[([^\]]+)\]", expand=False).fillna("")
    res_df["Term"] = term_series.str.replace(r"\s*\[[^\]]+\]", "", regex=True).str.strip()

    # --- Leading edge to CSV-style ---
    if "leading_edge" in res_df.columns:
        res_df["leading_edge"] = res_df["leading_edge"].apply(
            lambda x: ",".join(x) if isinstance(x, (list, tuple)) else str(x)
        )

    # --- Add Link column ---
    res_df["Link"] = "https://reactome.org/content/detail/" + res_df["ID"]

    # --- Add Pathway size (count propagated_edge or leading_edge genes) ---
    if "leading_edge" in res_df.columns:
        res_df["Pathway size"] = res_df["leading_edge"].apply(
            lambda x: len(x.split(",")) if isinstance(x, str) and x.strip() else 0
        )
    else:
        res_df["Pathway size"] = 0

    # --- Rename columns (Reactome-style) ---
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

    # --- Load hierarchy mapping ---
    if HIERARCHY_FILE.exists():
        hierarchy_df = pd.read_csv(HIERARCHY_FILE, sep="\t", header=None, names=["Parent pathway", "Child pathway"])
        # Merge on ID (Child pathway)
        res_df = res_df.merge(hierarchy_df, left_on="ID", right_on="Child pathway", how="left")
        # Collapse multiple parent pathways into comma-separated
        res_df = (
            res_df.groupby(
                [
                    "ID", "Link", "Pathway", "ES", "NES", "FDR", "p-value",
                    "Sidak's p-value", "Number of input genes", "Leading edge genes", "Pathway size"
                ],
                dropna=False
            )["Parent pathway"]
            .apply(lambda x: ",".join(sorted(set(x.dropna()))))
            .reset_index()
        )
    else:
        res_df["Parent pathway"] = ""

    return res_df
