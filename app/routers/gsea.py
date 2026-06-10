import tempfile

import numpy as np
import pandas as pd
import polars as pl
from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile

from app.models.gsea import (
    GeneSetLibraryEnum,
    GSEADirectionEnum,
    GseaJsonRequest,
    GseaJsonResponse,
)
from app.services.gsea import GSEA, get_libraries, run_gsea_from_dataframe
from app.utils.gsea_utils import handle_gsea_error, validate_gsea_dataframe

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
            # Load and validate DataFrame
            df = pl.read_csv(tmp.name, separator="\t")
            df = validate_gsea_dataframe(df)
            result = run_gsea_from_dataframe(df, gmt_name, analysis_direction)
            return result
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
    approved_symbols = request.app.state.approved_symbols
    try:
        # Convert request to DataFrame
        # genes_data = [
        #     {"symbol": g.symbol, "globalScore": g.globalScore} for g in gsea_input.genes
        # ]
        df = pl.DataFrame(gsea_input)
        gsea = GSEA(df)
        return gsea.run(gmt_name, approved_symbols, analysis_direction)
    except HTTPException:
        raise
    except Exception as e:
        raise handle_gsea_error(e)

    # Filter by NES based on analysis direction
    if analysis_direction == "one_sided_positive":
        res_df = res_df[res_df["NES"] > 0].copy()
    elif analysis_direction == "one_sided_negative":
        res_df = res_df[res_df["NES"] < 0].copy()

    # Replace NaN/Inf with JSON-safe values
    res_df = res_df.replace([np.inf, -np.inf], None)
    res_df = res_df.where(pd.notna(res_df), None)

    return {
        "results": res_df.to_dict(orient="records"),
        "input_overlap": input_overlap,
    }
