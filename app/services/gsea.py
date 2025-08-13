import os
import pandas as pd
import blitzgsea as blitz
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
GMT_DIR = DATA_DIR / "gmt"

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
    Run GSEA using a chosen GMT file name from available_gmt_files().
    """
    input_tsv = Path(input_tsv) if input_tsv else DEFAULT_TEST_INPUT

    gmt_files = available_gmt_files()
    if not gmt_name or gmt_name not in gmt_files:
        raise ValueError(f"Invalid gmt_name. Choose from: {list(gmt_files.keys())}")

    gmt_file = gmt_files[gmt_name]
    library_sets = load_custom_gmt(gmt_file)

    df = pd.read_csv(input_tsv, sep="\t")
    df = df.rename(columns={0: "symbol", 1: "globalScore"})
    df = df.sort_values("globalScore", ascending=False)

    res_df = blitz.gsea(df, library_sets, processes=processes).reset_index(names="Term")

    # res_df["propagated_edge"] = res_df["Term"].map(lambda t: ",".join(library_sets.get(t, [])))
    term_series = res_df["Term"]
    res_df["ID"] = term_series.str.extract(r"\[([^\]]+)\]", expand=False).fillna("")
    res_df["Term"] = term_series.str.replace(r"\s*\[[^\]]+\]", "", regex=True).str.strip()

    if "leading_edge" in res_df.columns:
        res_df["leading_edge"] = res_df["leading_edge"].apply(
            lambda x: ",".join(x) if isinstance(x, (list, tuple)) else str(x)
        )

    first_cols = ["Term", "ID"]
    return res_df[first_cols + [c for c in res_df.columns if c not in first_cols]]