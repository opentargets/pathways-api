import time
from concurrent.futures import ThreadPoolExecutor

import polars as pl
import pytest
from fastapi.testclient import TestClient

import app.main
import app.services.gsea
from app.models.gsea import GeneSetLibraryEnum as Library
from app.services.gsea import (
    GSEA,
    LIBRARY_CATEGORIES,
    get_approved_symbols,
    get_symbols,
    load_gene_sets,
    load_library_data,
    load_targets,
    with_symbols,
)

GENES = [f"ENSG{i:011d}" for i in range(300)]
# the last two genes share their symbol with gene 1
SYMBOLS = [f"SYM{i}" for i in range(298)] + ["SYM1", "SYM1"]
# OLD2 was the symbol of gene 2; SYM5 too, but gene 5 has it now; OLDX of two genes
OBSOLETE = {GENES[2]: ["OLD2", "SYM5", "OLDX"], GENES[3]: ["OLDX"]}
TARGETS = pl.DataFrame(
    {
        "id": GENES,
        "approvedSymbol": SYMBOLS,
        "obsoleteSymbols": [
            [{"label": s, "source": "HGNC"} for s in OBSOLETE.get(g, [])] for g in GENES
        ],
    },
    schema_overrides={
        "obsoleteSymbols": pl.List(pl.Struct({"label": pl.String, "source": pl.String}))
    },
)
GENE_SETS = pl.DataFrame(
    [
        # same label twice, two parents, no parents, genes that share a symbol
        ("R-HSA-1", "Immune System", "Reactome", [], GENES[:40] + GENES[298:]),
        ("R-HSA-2", "Signaling", "Reactome", ["R-HSA-1"], GENES[:20]),
        ("R-HSA-3", "Signaling", "Reactome", ["R-HSA-1", "R-HSA-2"], GENES[10:22]),
        *(
            (f"R-HSA-1{i}", f"set {i}", "Reactome", ["R-HSA-1"], GENES[i * 5 :][:25])
            for i in range(50)
        ),
        ("GO:1", "p", "GO:BP", [], GENES[:10]),
        ("GO:2", "f", "GO:MF", [], GENES[:10]),
        ("GO:3", "c", "GO:CC", [], GENES[:10]),
        ("5", "Kinase", "ChEMBL Target Class", [], GENES[:10]),
    ],
    schema={
        "id": pl.String,
        "label": pl.String,
        "category": pl.String,
        "parentIds": pl.List(pl.String),
        "entityIds": pl.List(pl.String),
    },
    orient="row",
)


@pytest.fixture
def release(tmp_path):
    for name, df in {"gene_sets": GENE_SETS, "target": TARGETS}.items():
        path = tmp_path / "output" / name
        path.mkdir(parents=True)
        # several parts, next to a marker file
        df[: len(df) // 2].write_parquet(path / "part-0.parquet")
        df[len(df) // 2 :].write_parquet(path / "part-1.parquet")
        (path / "_SUCCESS").touch()
    return str(tmp_path)


@pytest.fixture
def client(release, monkeypatch):
    monkeypatch.setattr(app.main.config, "RELEASE_PATH", release)
    with TestClient(app.main.app) as client:
        yield client


def analyze(client, genes, library="reactome"):
    return client.post(
        "/api/gsea/analyze/json",
        params={"gmt_name": library, "analysis_direction": "two_sided"},
        json={"genes": [g | {"globalScore": 1 - i / 120} for i, g in enumerate(genes)]},
    )


def test_libraries_match_the_release(release):
    targets, gene_sets = load_targets(release), load_gene_sets(release)
    symbol_of = dict(zip(GENES, SYMBOLS))
    assert set(LIBRARY_CATEGORIES) == set(Library)
    for library, category in LIBRARY_CATEGORIES.items():
        data = load_library_data(gene_sets, targets, library)
        expected = {
            id_: {symbol_of[g] for g in genes}
            for id_, genes in GENE_SETS.filter(pl.col("category") == category)
            .select("id", "entityIds")
            .iter_rows()
        }
        assert {k: set(v) for k, v in data.id_gene_mapping.items()} == expected
        assert all(len(v) == len(set(v)) for v in data.id_gene_mapping.values())
        assert data.background_genes == set().union(*expected.values())
    assert set(get_approved_symbols(targets)) == set(SYMBOLS)


def test_labels_links_and_parents(release):
    data = load_library_data(
        load_gene_sets(release), load_targets(release), Library.Reactome
    )
    signaling = data.lookup.filter(pl.col("pathway") == "Signaling")
    assert set(signaling["link"]) == {
        "https://reactome.org/content/detail/R-HSA-2",
        "https://reactome.org/content/detail/R-HSA-3",
    }
    edges = set(data.hierarchy.iter_rows())
    assert {("R-HSA-1", "R-HSA-3"), ("R-HSA-2", "R-HSA-3")} <= edges
    assert "R-HSA-1" not in {child for _, child in edges}


def test_missing_category_fails(release):
    with pytest.raises(ValueError, match="reactome"):
        load_library_data(
            GENE_SETS.filter(pl.col("category") != "Reactome"),
            load_targets(release),
            Library.Reactome,
        )


def test_with_symbols(release):
    symbols = get_symbols(load_targets(release))
    rows = [
        (GENES[5], "SYM9", "SYM5"),  # id first
        ("ENSG99999999999", "SYM9", "SYM9"),  # not a target
        (None, GENES[3], "SYM3"),
        (None, " OLD2 ", "SYM2"),
        (None, "SYM5", "SYM5"),  # approved wins over obsolete
        (None, "OLDX", "OLDX"),  # obsolete symbol of two targets
        (None, "SYM1", "SYM1"),
        ("nope", None, "nope"),
    ]
    df = pl.DataFrame(
        [r[:2] for r in rows],
        schema={"id": pl.String, "symbol": pl.String},
        orient="row",
    )
    expected = [r[2] for r in rows]
    assert with_symbols(df, symbols)["symbol"].to_list() == expected


def test_ids_and_symbols_give_the_same_results(client):
    pairs = list(zip(GENES, SYMBOLS))[:120]
    responses = [
        analyze(client, genes)
        for genes in (
            [{"id": g} for g, _ in pairs],
            [{"symbol": s} for _, s in pairs],
            [{"id": g, "symbol": s} for g, s in pairs],
        )
    ]
    assert [r.status_code for r in responses] == [200] * 3
    by_id, *others = [
        sorted(r.json()["results"], key=lambda x: x["ID"]) for r in responses
    ]
    assert all(by_id == other for other in others)
    result = {r["ID"]: r for r in by_id}["R-HSA-3"]
    assert result["Pathway"] == "Signaling"
    assert result["Parent pathway"] == "R-HSA-1,R-HSA-2"
    assert result["Pathway size"] == 12
    assert result["Pathway genes"] == SYMBOLS[10:22]
    assert analyze(client, [{}]).status_code == 422


def test_library_names_have_no_year_and_old_names_still_work(client):
    names = client.get("/api/gsea/libraries").json()
    assert names == [library.value for library in Library]
    assert not any("2025" in name for name in names)
    genes = [{"id": g} for g in GENES[:120]]
    assert analyze(client, genes, "reactome_2025").status_code == 200
    assert analyze(client, genes, "unknown_2025").status_code == 422


def test_release_is_read_once_per_application(release, monkeypatch):
    reads = []
    monkeypatch.setattr(app.main.config, "RELEASE_PATH", release)
    monkeypatch.setattr(
        app.main, "load_gene_sets", lambda p: reads.append(p) or load_gene_sets(p)
    )
    with TestClient(app.main.app) as client:
        for _ in range(2):
            assert analyze(client, [{"id": g} for g in GENES[:120]]).status_code == 200
    assert reads == [release]


def test_application_needs_a_release(monkeypatch):
    monkeypatch.setattr(app.main.config, "RELEASE_PATH", "")
    with pytest.raises(RuntimeError, match="RELEASE_PATH"):
        with TestClient(app.main.app):
            pass


def test_gsea_runs_one_at_a_time(release, monkeypatch):
    targets = load_targets(release)
    library = load_library_data(load_gene_sets(release), targets, Library.Reactome)
    blitz_gsea, running, most = app.services.gsea.blitz.gsea, [], []

    def slow_gsea(*args):
        running.append(1)
        most.append(len(running))
        time.sleep(0.05)
        try:
            return blitz_gsea(*args)
        finally:
            running.pop()

    monkeypatch.setattr(app.services.gsea.blitz, "gsea", slow_gsea)
    df = pl.DataFrame({"symbol": SYMBOLS[:120], "globalScore": range(120, 0, -1)})
    df = df.cast({"globalScore": pl.Float64})
    with ThreadPoolExecutor(4) as executor:
        for _ in range(4):
            executor.submit(GSEA(df).run, library, get_approved_symbols(targets))
    assert most == [1, 1, 1, 1]


def test_padding_genes_are_shuffled_not_alphabetical(release, monkeypatch):
    targets = load_targets(release)
    library = load_library_data(load_gene_sets(release), targets, Library.Reactome)
    blitz_gsea, signatures = app.services.gsea.blitz.gsea, []

    def capture(signature, *args):
        signatures.append(signature)
        return blitz_gsea(signature, *args)

    monkeypatch.setattr(app.services.gsea.blitz, "gsea", capture)
    df = pl.DataFrame({"symbol": SYMBOLS[:5], "globalScore": [5.0, 4, 3, 2, 1]})
    for _ in range(2):
        GSEA(df).run(library, get_approved_symbols(targets))

    first, second = signatures
    assert first["symbol"][:5].to_list() == SYMBOLS[:5]
    padding = first.filter(pl.col("globalScore") == 0)["symbol"].to_list()
    assert len(padding) > 100
    assert padding != sorted(padding)
    assert first.equals(second)
