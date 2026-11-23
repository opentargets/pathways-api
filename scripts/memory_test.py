"""Peak memory of loading all libraries, then of one GSEA run on the largest one.

RELEASE_PATH=... uv run python -m scripts.memory_test [number of input genes]
"""

import random
import resource
import sys
import time

import polars as pl

from app.config import get_config
from app.models.gsea import GeneSetLibraryEnum
from app.services.gsea import (
    GSEA,
    get_approved_symbols,
    load_gene_sets,
    load_library_data,
    load_targets,
)


def peak_mb() -> float:
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return peak / 1e6 if sys.platform == "darwin" else peak / 1e3


def main(n_genes: int) -> None:
    release = get_config().RELEASE_PATH
    print(f"imports:         peak {peak_mb():.0f} MB")

    start = time.perf_counter()
    targets, gene_sets = load_targets(release), load_gene_sets(release)
    symbols = get_approved_symbols(targets)
    libraries = [load_library_data(gene_sets, targets, x) for x in GeneSetLibraryEnum]
    print(
        f"load libraries:  peak {peak_mb():.0f} MB, {time.perf_counter() - start:.1f} s"
    )

    library = max(libraries, key=lambda x: sum(map(len, x.id_gene_mapping.values())))
    rng = random.Random(0)
    genes = rng.sample(sorted(library.background_genes), n_genes)
    df = pl.DataFrame({"symbol": genes, "globalScore": [rng.random() for _ in genes]})
    start = time.perf_counter()
    GSEA(df).results(library, symbols)
    print(
        f"GSEA {library.library.value}, {n_genes} genes: "
        f"peak {peak_mb():.0f} MB, {time.perf_counter() - start:.1f} s"
    )


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 2000)
