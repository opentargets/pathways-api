from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from app.services.gsea import run_gsea, available_gmt_files
import tempfile
import pandas as pd
import os
import numpy as np

router = APIRouter()

@router.get("/gsea/libraries")
async def list_gmt_files():
    """List available GMT libraries."""
    return list(available_gmt_files().keys())


@router.post("/gsea")
async def gsea_endpoint(
    tsv_file: UploadFile = File(..., description="TSV file containing at least 2 columns: 'symbol' and 'globalScore'"),
    gmt_name: str = Query(..., description="GMT library name (without .gmt extension)")
):
    # Validate file extension
    if not tsv_file.filename.endswith(".tsv"):
        raise HTTPException(status_code=400, detail="File must be .tsv format")

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tsv") as tmp:
        content = await tsv_file.read()
        tmp.write(content)
        tsv_path = tmp.name

    # Validate TSV structure
    try:
        df = pd.read_csv(tsv_path, sep="\t", nrows=1)  # read first row
        if not {"symbol", "globalScore"}.issubset(df.columns) and not {0, 1}.issubset(df.columns):
            raise ValueError("TSV must contain 'symbol' and 'globalScore' columns (or two unnamed columns).")
    except Exception as e:
        os.unlink(tsv_path)
        raise HTTPException(status_code=400, detail=f"Invalid TSV format: {str(e)}")

    # Run GSEA
    try:
        res_df = run_gsea(input_tsv=tsv_path, gmt_name=gmt_name)
    finally:
        # Clean up temp file
        os.unlink(tsv_path)

    # # Replace NaN/Inf with JSON-safe values
    # res_df = res_df.replace([np.inf, -np.inf], None)
    # res_df = res_df.where(pd.notna(res_df), None)

    return res_df.to_dict(orient="records")
