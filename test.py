import json

import numpy as np
import pandas as pd
import polars as pl
from loguru import logger

import app.services.gsea as gsea
from app.utils import validate_gsea_dataframe


def main(x=10):
    with open("test.json") as f:
        correct = json.load(f)
    for i in range(1, x + 1):
        # log the iteration
        logger.info("iteration: {}", i)
        j = pl.read_json("/Users/jhayhurst/Downloads/genes.json")
        j = validate_gsea_dataframe(j)
        res_df, input_overlap = gsea.run_gsea_from_dataframe(
            j, "Reactome/ReactomePathways_2025"
        )

        res_df = res_df[res_df["NES"] > 0].copy()

        # Replace NaN/Inf with JSON-safe values
        res_df = res_df.replace([np.inf, -np.inf], None)
        res_df = res_df.where(pd.notna(res_df), None)

        x = {
            "input_overlap": input_overlap,
            "results": res_df.to_dict(orient="records"),
        }
        assert x["input_overlap"] == correct["input_overlap"]


if __name__ == "__main__":
    main()
