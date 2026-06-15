import tempfile

import polars as pl
from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile

from app.models.gsea import (
    GeneSetLibraryEnum,
    GSEADirectionEnum,
    GseaJsonRequest,
    GseaJsonResponse,
)
from app.services.gsea import GSEA, get_libraries
from app.utils.gsea_utils import handle_gsea_error

router = APIRouter()


@router.get("/gsea/libraries")
async def list_gmt_files() -> list[str]:
    """List available GMT libraries."""
    return get_libraries()


@router.post("/gsea/analyze/file", response_model=GseaJsonResponse)
async def analyze_gsea_from_file(
    request: Request,
    tsv_file: UploadFile = File(
        ...,
        description="TSV file containing at least 2 columns: 'symbol' and 'globalScore'",
        regex=r"\.tsv$",
    ),
    gmt_name: GeneSetLibraryEnum = Query(..., description="GMT library name"),
    analysis_direction: GSEADirectionEnum = Query(
        default=GSEADirectionEnum.OneSidedPositive,
        description="Analysis direction: 'one_sided_positive' filters NES > 0, 'one_sided_negative' filters NES < 0, 'two_sided' returns all results",
    ),
):
    """
    Run GSEA analysis from uploaded TSV file.

    Upload a TSV file with gene symbols and scores to perform Gene Set Enrichment Analysis.

    Example:
        POST /api/gsea/analyze/file?gmt_name=Reactome/ReactomePathways_2025
        Content-Type: multipart/form-data
        Body: file=your_data.tsv
    """

    # Read and validate file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tsv") as tmp:
        content = tsv_file.file.read()
        tmp.write(content)
        try:
            df = pl.read_csv(tmp.name, separator="\t")
            gsea = GSEA(df, request.app.state.config.DATABASE_PATH, validate=True)
            result = gsea.results(
                gmt_name, request.app.state.approved_symbols, analysis_direction
            )
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise handle_gsea_error(e)


@router.post("/gsea/analyze/json", response_model=GseaJsonResponse)
async def analyze_gsea_from_json(
    request: Request,
    gsea_input: GseaJsonRequest,
    gmt_name: GeneSetLibraryEnum = Query(..., description="GMT library name"),
    analysis_direction: GSEADirectionEnum = Query(
        default=GSEADirectionEnum.OneSidedPositive,
        description="Analysis direction: 'one_sided_positive' filters NES > 0, 'one_sided_negative' filters NES < 0, 'two_sided' returns all results",
    ),
):
    """
    Run GSEA analysis from JSON payload.

    Send gene data as JSON to perform Gene Set Enrichment Analysis.

    Example:
        POST /api/gsea/analyze/json?gmt_name=Reactome/ReactomePathways_2025
        Content-Type: application/json
        Body: {
            "genes": [
                {"symbol": "BRCA1", "globalScore": 0.95},
                {"symbol": "TP53", "globalScore": 0.87}
            ]
        }
    """
    try:
        df = pl.DataFrame(gsea_input.genes)
        gsea = GSEA(df, request.app.state.db_connection, validate=False)
        return gsea.results(
            gmt_name, request.app.state.approved_symbols, analysis_direction
        )
    except HTTPException:
        raise
    except Exception as e:
        raise handle_gsea_error(e)
