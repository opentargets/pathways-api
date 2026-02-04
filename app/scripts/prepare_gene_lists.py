from pathlib import Path
import logging


BASE_DIR = Path(__file__).resolve().parents[1]  # app/
DATA_DIR = BASE_DIR / "data"
GMT_DIR = DATA_DIR / "gmt"
MIN_GENE_COL_IDX = 2
LOGGER = logging.getLogger(__name__)


def _collect_genes_from_gmt_file(gmt_path: Path) -> set[str]:
    genes: set[str] = set()
    with gmt_path.open("r") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) > MIN_GENE_COL_IDX:
                # All tokens after the second column are gene symbols
                for token in parts[MIN_GENE_COL_IDX:]:
                    stripped = token.strip()
                    if stripped:
                        genes.add(stripped)
    return genes

def generate_background_for_gmt(gmt_path: Path, suffix: str = "_background") -> Path | None:
    """
    Generate a deduplicated, sorted list of all genes present in the given .gmt
    file and write them to an output file named `<input_stem>{suffix}` in the
    same directory (no header). For example, `ReactomePathways_2025.gmt` ->
    `ReactomePathways_2025_background`.

    Skips work if the output exists and is newer than the .gmt file.
    Returns the output path if written/updated, or None if skipped.
    """
    if not gmt_path.exists() or gmt_path.suffix.lower() != ".gmt":
        return None

    out_path = gmt_path.with_name(f"{gmt_path.stem}{suffix}")

    # Skip if up-to-date
    if out_path.exists() and out_path.stat().st_mtime >= gmt_path.stat().st_mtime:
        return None

    genes = _collect_genes_from_gmt_file(gmt_path)

    # Write without header, one gene per line, sorted for determinism
    with out_path.open("w") as f:
        for gene in sorted(genes):
            f.write(f"{gene}\n")

    return out_path


def generate_all_library_gene_lists(suffix: str = "_background") -> list[Path]:
    """
    For each .gmt file under each subdirectory in app/data/gmt, generate a
    background gene list named `<input_stem>{suffix}` in the same directory.
    Returns the list of paths that were written/updated.
    """
    written: list[Path] = []
    if not GMT_DIR.exists():
        return written

    for library_dir in sorted(p for p in GMT_DIR.iterdir() if p.is_dir()):
        for gmt_path in sorted(library_dir.glob("*.gmt")):
            out = generate_background_for_gmt(gmt_path, suffix=suffix)
            if out is not None:
                written.append(out)
    return written


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    updated = generate_all_library_gene_lists()
    if updated:
        LOGGER.info("Generated/updated gene lists:")
        for p in updated:
            LOGGER.info("%s", p)
    else:
        LOGGER.info("All background gene lists are up-to-date.")
