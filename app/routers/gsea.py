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
def analyze_gsea_from_file(
    request: Request,
    tsv_file: UploadFile = File(
        ...,
        description="TSV file containing at least 2 columns: 'symbol' and 'globalScore'",
        pattern=r"\.tsv$",
    ),
    gmt_name: GeneSetLibraryEnum = Query(..., description="GMT library name"),
    analysis_direction: GSEADirectionEnum = Query(
        default=GSEADirectionEnum.OneSidedPositive,
        description="Analysis direction: 'one_sided_positive' filters NES > 0, 'one_sided_negative' filters NES < 0, 'two_sided' returns all results",
    ),
):
    """
    Run GSEA analysis from an uploaded TSV file.

    The file must contain 'symbol' and 'globalScore' columns.

    Example:
        POST /api/gsea/analyze/file?gmt_name=reactome_2025
        Content-Type: multipart/form-data
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tsv") as tmp:
        tmp.write(tsv_file.file.read())
        try:
            df = pl.read_csv(tmp.name, separator="\t")
            library_data = request.app.state.libraries[gmt_name]
            gsea = GSEA(df, validate=True)
            return gsea.results(
                library_data,
                request.app.state.approved_symbols,
                analysis_direction,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise handle_gsea_error(e)


@router.post("/gsea/analyze/json", response_model=GseaJsonResponse)
def analyze_gsea_from_json(
    request: Request,
    gsea_input: GseaJsonRequest,
    gmt_name: GeneSetLibraryEnum = Query(..., description="GMT library name"),
    analysis_direction: GSEADirectionEnum = Query(
        default=GSEADirectionEnum.OneSidedPositive,
        description="Analysis direction: 'one_sided_positive' filters NES > 0, 'one_sided_negative' filters NES < 0, 'two_sided' returns all results",
    ),
):
    """
    Run GSEA analysis from a JSON payload.

    Example:
        POST /api/gsea/analyze/json?gmt_name=reactome_2025
        Body: {"genes": [{"symbol": "BRCA1", "globalScore": 0.95}]}
    """
    try:
        df = pl.DataFrame([gene.model_dump() for gene in gsea_input.genes])
        library_data = request.app.state.libraries[gmt_name]
        gsea = GSEA(df, validate=False)
        return gsea.results(
            library_data,
            request.app.state.approved_symbols,
            analysis_direction,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise handle_gsea_error(e)
