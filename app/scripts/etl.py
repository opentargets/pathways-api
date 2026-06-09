from pathlib import Path

import click
import duckdb
import polars as pl
from loguru import logger

from app.models.gsea import GeneSetLibraryEnum


class ETLClient:
    BASE_DIR = Path(__file__).resolve().parents[1]  # app/
    DATA_DIR = BASE_DIR / "data"
    GMT_DIR = DATA_DIR / "gmt"
    MIN_GENE_COL_IDX = 1
    DATABASE_PATH = BASE_DIR / "pathways.db"

    def __init__(self, gcs_path: str, overwrite: bool = False):
        self.gcs_path = gcs_path
        self.overwrite = overwrite

    def run(self):
        with duckdb.connect(self.DATABASE_PATH) as con:
            if self.overwrite:
                con.execute("DROP TABLE IF EXISTS hierarchy")
                con.execute("DROP TABLE IF EXISTS approved_symbols")
                con.execute("DROP TABLE IF EXISTS libraries")
                con.execute("DROP TABLE IF EXISTS background")
            self._approved_symbols_etl(con)
            self._library_gene_lists_etl(con)

    def _approved_symbols_etl(self, con):
        logger.info("Loading approved symbols from GCS...")
        df = pl.read_parquet(self.gcs_path, columns=["approvedSymbol"])
        con.execute(
            "CREATE TABLE IF NOT EXISTS approved_symbols (approvedSymbol VARCHAR)"
        )
        con.execute("INSERT INTO approved_symbols from df")
        logger.info("Approved symbols loaded successfully.")

    @staticmethod
    def _contains_braces(f: str) -> bool:
        return "{" and "}" in f

    def _id_gene_mapping(self, gmt_file: Path) -> dict[str, list[str]]:
        id_to_genes = {}
        with gmt_file.open("r") as f:
            contains_braces = self._contains_braces(f.read())
            f.seek(0)  # reset to start of file
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) > self.MIN_GENE_COL_IDX:
                    term = parts[0]
                    genes = parts[self.MIN_GENE_COL_IDX :]
                    if contains_braces and "{" in term and "}" in term:
                        start = term.find("{") + 1
                        end = term.find("}", start)
                        if end > start:
                            id_ = term[start:end]
                            id_to_genes[id_] = genes
                    else:
                        # if no braces, map Term itself as ID
                        id_to_genes[term] = genes
        return id_to_genes

    def _collect_genes_from_gmt_file(self, gmt_path: Path) -> set[str]:
        genes: set[str] = set()
        with gmt_path.open("r") as f:
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) > self.MIN_GENE_COL_IDX:
                    # All tokens after the second column are gene symbols
                    for token in parts[self.MIN_GENE_COL_IDX :]:
                        stripped = token.strip()
                        if stripped:
                            genes.add(stripped)
        return genes

    def _load_background_for_gmt(
        self,
        con: duckdb.DuckDBPyConnection,
        library: GeneSetLibraryEnum,
        gmt_path: Path,
    ) -> None:
        """
        Generate a deduplicated, sorted list of all genes present in the given .gmt
        file and write them to the database.
        """

        genes = self._collect_genes_from_gmt_file(gmt_path)
        con.execute(
            "CREATE TABLE IF NOT EXISTS background (library VARCHAR PRIMARY KEY, genes VARCHAR[])"
        )
        con.execute(
            "INSERT INTO background VALUES (?, ?)",
            (library.value, sorted(genes)),
        )
        con.execute("CREATE INDEX IF NOT EXISTS idx_background ON background (library)")

    def _load_gene_sets(
        self,
        con: duckdb.DuckDBPyConnection,
        library: GeneSetLibraryEnum,
        gmt_path: Path,
    ) -> None:
        gene_sets = self._id_gene_mapping(gmt_path)
        con.execute(
            "CREATE TABLE IF NOT EXISTS libraries (library VARCHAR PRIMARY KEY, gene_sets MAP(VARCHAR, VARCHAR[]))"
        )
        con.execute("INSERT INTO libraries VALUES (?, ?)", (library.value, gene_sets))
        con.execute("CREATE INDEX IF NOT EXISTS idx_libraries ON libraries (library)")

    def _load_hierarchy(
        self,
        con: duckdb.DuckDBPyConnection,
        library: GeneSetLibraryEnum,
        hierarchy_path: Path,
    ) -> None:
        df = pl.read_csv(
            hierarchy_path,
            separator="\t",
            has_header=False,
            new_columns=["parent", "child"],
        ).with_columns(pl.lit(library.value).alias("library"))
        con.execute(
            "CREATE TABLE IF NOT EXISTS hierarchy (library VARCHAR, parent VARCHAR, child VARCHAR)"
        )
        con.execute("INSERT INTO hierarchy SELECT library, parent, child FROM df")
        con.execute("CREATE INDEX IF NOT EXISTS idx_hierarchy ON hierarchy (library)")

    def _library_gene_lists_etl(self, con: duckdb.DuckDBPyConnection) -> None:
        """
        For each .gmt file under each subdirectory in app/data/gmt, generate a
        background gene list named `<input_stem>{suffix}` in the same directory.
        Returns the list of paths that were written/updated.
        """

        for library in GeneSetLibraryEnum:
            gmt_path = self.GMT_DIR / library.value / "gene_sets.gmt"
            if not gmt_path.exists():
                raise FileNotFoundError(f"Missing .gmt file for library: {library}")
            self._load_background_for_gmt(con, library, gmt_path)
            self._load_gene_sets(con, library, gmt_path)
            hierarchy_path = self.GMT_DIR / library.value / "hierarchy.tsv"
            if not hierarchy_path.exists():
                raise FileNotFoundError(
                    f"Missing hierarchy file for library: {library}"
                )
            self._load_hierarchy(con, library, hierarchy_path)


@click.command()
@click.option(
    "--gcs-path",
    default="gs://open-targets-pre-data-releases/25.09/output/target/",
    help="GCS path to the data",
)
@click.option(
    "--overwrite",
    is_flag=True,
    help="Overwrite existing data",
)
def main(gcs_path, overwrite):
    etl = ETLClient(gcs_path, overwrite=overwrite)
    etl.run()


if __name__ == "__main__":
    main()
