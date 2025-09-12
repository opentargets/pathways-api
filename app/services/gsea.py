import os
import pandas as pd
import blitzgsea as blitz
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
GMT_DIR = DATA_DIR / "gmt"

def load_custom_gmt(path):
    with open(path, 'r') as f:
        return {
            parts[0]: parts[2:]
            for line in f
            if (parts := line.strip().split('\t')) and len(parts) > 2
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
    for folder in GMT_DIR.iterdir():
        if folder.is_dir():
            gmt_files = list(folder.glob("*.gmt"))
            txt_files = list(folder.glob("*.txt"))
            if not gmt_files:
                continue
            gmt_file = gmt_files[0]
            hierarchy_file = txt_files[0] if txt_files else None
            libraries[f"{folder.name}/{gmt_file.stem}"] = {
                "gmt": gmt_file,
                "hierarchy": hierarchy_file
            }
    return libraries

def run_gsea(input_tsv=None, gmt_name=None, processes=4):
    """
    Run GSEA using a chosen GMT library and its hierarchy (if present).
    """
    input_tsv = Path(input_tsv) if input_tsv else DEFAULT_TEST_INPUT

    gmt_files = available_gmt_files()
    if not gmt_name or gmt_name not in gmt_files:
        raise ValueError(f"Invalid gmt_name. Choose from: {list(gmt_files.keys())}")

    gmt_file = gmt_files[gmt_name]["gmt"]
    hierarchy_file = gmt_files[gmt_name]["hierarchy"]

    library_sets = load_custom_gmt(gmt_file)

    # --- Load input file safely ---
    df = pd.read_csv(input_tsv, sep="\t")

    if set(df.columns) == set(range(len(df.columns))):
        df = df.rename(columns={0: "symbol", 1: "globalScore"})

    if not {"symbol", "globalScore"}.issubset(df.columns):
        raise ValueError("Input file must contain 'symbol' and 'globalScore' columns.")

    df = df[["symbol", "globalScore"]].copy()
    df = df.sort_values("globalScore", ascending=False)

    res_df = blitz.gsea(df, library_sets, processes=processes).reset_index(names="Term")

    # --- Extract IDs and clean terms (IDs now in { }) ---
    term_series = res_df["Term"]
    res_df["ID"] = term_series.str.extract(r"\{([^}]+)\}", expand=False).fillna("")
    res_df["Term"] = term_series.str.replace(r"\s*\{[^}]+\}", "", regex=True).str.strip()

    if "leading_edge" in res_df.columns:
        res_df["leading_edge"] = res_df["leading_edge"].apply(
            lambda x: ",".join(x) if isinstance(x, (list, tuple)) else str(x)
        )

    # --- Dynamic link assignment ---
    if gmt_file.stem.startswith("GO"):
        res_df["Link"] = "https://www.ebi.ac.uk/QuickGO/term/" + res_df["ID"]
    else:
        res_df["Link"] = "https://reactome.org/content/detail/" + res_df["ID"]

    if "leading_edge" in res_df.columns:
        res_df["Pathway size"] = res_df["leading_edge"].apply(
            lambda x: len(x.split(",")) if isinstance(x, str) and x.strip() else 0
        )
    else:
        res_df["Pathway size"] = 0

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
            names=["Parent pathway", "Child pathway"]
        )
        res_df = res_df.merge(
            hierarchy_df, left_on="ID", right_on="Child pathway", how="left"
        )
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