from pathlib import Path

import duckdb
import polars as pl

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "pathways.db"


class ETLClient:
    def __init__(self, database_path: Path, gcs_path: str):
        self.database_path = database_path
        self.gcs_path = gcs_path

    def run(self):
        with duckdb.connect(self.database_path) as con:
            self._approved_symbols_etl(con)

    def _approved_symbols_etl(self, con):
        df = pl.read_parquet(self.gcs_path, columns=["approvedSymbol"])
        con.sql("CREATE OR REPLACE TABLE approved_symbols (approvedSymbol VARCHAR)")
        con.sql("INSERT INTO approved_symbols from df")


def main():
    etl = ETLClient(
        DATABASE_PATH, "gs://open-targets-pre-data-releases/25.09/output/target/"
    )
    etl.run()


if __name__ == "__main__":
    main()
