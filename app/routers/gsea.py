from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from app.services.gsea import run_gsea_from_dataframe, available_gmt_files
from app.models.gsea import GseaJsonRequest
from app.utils.gsea_utils import validate_gsea_dataframe, handle_gsea_error
import tempfile
import pandas as pd
import os

router = APIRouter()


@router.get("/gsea/libraries")
async def list_gmt_files():
    """List available GMT libraries."""
    return list(available_gmt_files().keys())


@router.post("/gsea/analyze/file")
async def analyze_gsea_from_file(
    tsv_file: UploadFile = File(
        ...,
        description="TSV file containing at least 2 columns: 'symbol' and 'globalScore'",
    ),
    gmt_name: str = Query(..., description="GMT library name (without .gmt extension)"),
):
    """
    Run GSEA analysis from uploaded TSV file.
    
    Upload a TSV file with gene symbols and scores to perform Gene Set Enrichment Analysis.
    
    Example:
        POST /api/gsea/analyze/file?gmt_name=Reactome/ReactomePathways_2025
        Content-Type: multipart/form-data
        Body: file=your_data.tsv
    """
    # Validate file extension
    if not tsv_file.filename.endswith(".tsv"):
        raise HTTPException(status_code=400, detail="File must be .tsv format")

    # Read and validate file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tsv") as tmp:
        content = await tsv_file.read()
        tmp.write(content)
        tsv_path = tmp.name

    try:
        # Load and validate DataFrame
        df = pd.read_csv(tsv_path, sep="\t")
        df = validate_gsea_dataframe(df)

        # Run GSEA
        res_df = run_gsea_from_dataframe(df, gmt_name)

    except HTTPException:
        raise
    except Exception as e:
        raise handle_gsea_error(e)
    finally:
        # Clean up temp file
        if os.path.exists(tsv_path):
            os.unlink(tsv_path)

    return res_df.to_dict(orient="records")


@router.post("/gsea/analyze/json")
async def analyze_gsea_from_json(
    request: GseaJsonRequest,
    gmt_name: str = Query(..., description="GMT library name (without .gmt extension)"),
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
        # Convert request to DataFrame
        genes_data = [
            {"symbol": g.symbol, "globalScore": g.globalScore} for g in request.genes
        ]
        df = pd.DataFrame(genes_data)

        # Validate DataFrame (should already be valid via Pydantic, but double-check)
        df = validate_gsea_dataframe(df)

        # Run GSEA directly (no file I/O needed!)
        res_df = run_gsea_from_dataframe(df, gmt_name)

    except HTTPException:
        raise
    except Exception as e:
        raise handle_gsea_error(e)

    return res_df.to_dict(orient="records")
