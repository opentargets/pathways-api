import os
import pandas as pd
import blitzgsea as blitz
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
GMT_DIR = DATA_DIR / "gmt"


def load_custom_gmt(path):
    with open(path, "r") as f:
        return {
            parts[0]: parts[2:]
            for line in f
            if (parts := line.strip().split("\t")) and len(parts) > 2
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
                "hierarchy": hierarchy_file,
            }
    return libraries


def run_gsea(input_tsv=None, gmt_name=None, processes=4):
    """
    Run GSEA using a chosen GMT library and its hierarchy (if present).
    Pathway size is computed from the GMT (total genes in the pathway).
    Ensure 'Number of input genes' and 'Pathway size' are integers (no .0).
    """
    input_tsv = Path(input_tsv) if input_tsv else DEFAULT_TEST_INPUT

    gmt_files = available_gmt_files()
    if not gmt_name or gmt_name not in gmt_files:
        raise ValueError(f"Invalid gmt_name. Choose from: {list(gmt_files.keys())}")

    gmt_file = gmt_files[gmt_name]["gmt"]
    hierarchy_file = gmt_files[gmt_name]["hierarchy"]

    # load library sets (term -> genes list)
    library_sets = load_custom_gmt(gmt_file)

    # --- Check if GMT file contains IDs in braces {ID} ---
    contains_braces = False
    with open(gmt_file, "r") as f:
        for line in f:
            if "{" in line and "}" in line:
                contains_braces = True
                break

    # Build ID -> genes mapping from the GMT file
    id_to_genes = {}
    with open(gmt_file, "r") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) > 2:
                term = parts[0]
                genes = parts[2:]
                if contains_braces and "{" in term and "}" in term:
                    start = term.find("{") + 1
                    end = term.find("}", start)
                    if end > start:
                        id_ = term[start:end]
                        id_to_genes[id_] = genes
                else:
                    # if no braces, map Term itself as ID
                    id_to_genes[term] = genes

    # --- Load input file safely ---
    df = pd.read_csv(input_tsv, sep="\t")

    if set(df.columns) == set(range(len(df.columns))):
        df = df.rename(columns={0: "symbol", 1: "globalScore"})

    if not {"symbol", "globalScore"}.issubset(df.columns):
        raise ValueError("Input file must contain 'symbol' and 'globalScore' columns.")

    df = df[["symbol", "globalScore"]].copy()
    df = df.sort_values("globalScore", ascending=False)

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
        "geneset_size": "Input gene number",
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
                    "Input gene number",
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

    # --- Final: ensure integer formatting for counts (no .0) ---
    def safe_int_col(df_, col_name):
        """
        Clean a column (remove commas, coerce non-numeric → NaN), fill NaN with 0, then convert to int.
        """
        if col_name in df_.columns:
            s = df_[col_name].astype(str).str.replace(",", "", regex=False).str.strip()
            s = s.replace({"": None, "nan": None})
            df_[col_name] = pd.to_numeric(s, errors="coerce").fillna(0).astype(int)

    safe_int_col(res_df, "Input gene number")
    safe_int_col(res_df, "Pathway size")

    return res_df
