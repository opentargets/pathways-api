from fastapi import APIRouter, UploadFile, File, Query
from app.services.gsea import run_gsea, available_gmt_files
import tempfile
import pandas as pd
import os

router = APIRouter()

@router.get("/gsea/libraries")
async def list_gmt_files():
    """List available GMT libraries."""
    return list(available_gmt_files().keys())


@router.post("/gsea")
async def gsea_endpoint(
    tsv_file: UploadFile = File(..., description="TSV file with 2 columns: symbol and globalScore"),
    gmt_name: str = Query(..., description="GMT library name (without .gmt extension)")
):
    # Validate file extension
    if not tsv_file.filename.endswith('.tsv'):
        raise HTTPException(400, detail="File must be .tsv format")
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.tsv') as tmp:
        content = await tsv_file.read()
        tmp.write(content)
        tsv_path = tmp.name
    
    # Validate TSV structure
    try:
        df = pd.read_csv(tsv_path, sep='\t', header=None, nrows=1)
        if df.shape[1] != 2:
            raise ValueError("TSV must have exactly 2 columns")
    except Exception as e:
        raise HTTPException(400, detail=f"Invalid TSV format: {str(e)}")
    
    # Run GSEA
    res_df = run_gsea(input_tsv=tsv_path, gmt_name=gmt_name)
    
    # Clean up
    os.unlink(tsv_path)
    
    return res_df.to_dict(orient="records")
