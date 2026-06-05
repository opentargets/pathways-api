import json

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
        j = pl.read_json("test_input.json")
        gmt = "Reactome/ReactomePathways_2025"

        j = validate_gsea_dataframe(j)
        res_df, input_overlap = gsea.run_gsea_from_dataframe(j, gmt)

        # Filter results
        res_df = res_df.filter(pl.col("NES") > 0)

        x = {
            "input_overlap": input_overlap,
            "results": res_df.to_dicts(),
        }
        assert x["input_overlap"] == correct["input_overlap"]


if __name__ == "__main__":
    main()
