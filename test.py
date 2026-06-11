import duckdb
import polars as pl
from loguru import logger

import app.services.gsea as gsea
from app.config import get_config
from app.models import GeneSetLibraryEnum


def main(x=1):
    config = get_config()
    conn = duckdb.connect(config.DATABASE_PATH)
    approved_symbols = gsea.get_approved_symbols(conn)
    # with open("test.json") as f:
    #     correct = json.load(f)
    for i in range(1, x + 1):
        # log the iteration

        logger.info("iteration: {}", i)
        j = pl.read_json("test_input2.json")
        gmt = GeneSetLibraryEnum.ChEMBLTargetClass
        g = gsea.GSEA(j, conn, validate=False)
        res = g.results(gmt, approved_symbols)
        with open("test_output_2.json", "w") as f:
            f.write(res.model_dump_json(by_alias=True))
        # assert res.input_overlap == correct["input_overlap"]
    conn.close()


if __name__ == "__main__":
    main()
