from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Body
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
    tsv_file: UploadFile = File(
        ...,
        description="TSV file containing at least 2 columns: 'symbol' and 'globalScore'",
    ),
    gmt_name: str = Query(..., description="GMT library name (without .gmt extension)"),
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
        if not {"symbol", "globalScore"}.issubset(df.columns) and not {0, 1}.issubset(
            df.columns
        ):
            raise ValueError(
                "TSV must contain 'symbol' and 'globalScore' columns (or two unnamed columns)."
            )
    except Exception as e:
        os.unlink(tsv_path)
        raise HTTPException(status_code=400, detail=f"Invalid TSV format: {str(e)}")

    # Run GSEA
    try:
        res_df = run_gsea(input_tsv=tsv_path, gmt_name=gmt_name)
    finally:
        # Clean up temp file
        os.unlink(tsv_path)

    return res_df.to_dict(orient="records")


@router.post("/gsea/json")
async def gsea_json_endpoint(
    gmt_name: str = Query(..., description="GMT library name (without .gmt extension)"),
    payload: dict = Body(
        ..., description="JSON body with 'genes': [{symbol, globalScore}]"
    ),
):
    """
    Run GSEA using JSON payload instead of file upload.
    Expects: { "genes": [{"symbol": str, "globalScore": float}, ...] }
    """
    # Validate payload
    genes = payload.get("genes") if isinstance(payload, dict) else None
    if not isinstance(genes, list) or len(genes) == 0:
        raise HTTPException(
            status_code=400, detail="Payload must include non-empty 'genes' list"
        )

    # Convert to DataFrame and validate columns
    try:
        df = pd.DataFrame(genes)
        if not {"symbol", "globalScore"}.issubset(df.columns):
            raise ValueError("Each gene must include 'symbol' and 'globalScore'")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid genes payload: {str(e)}")

    # Write to a temporary TSV and reuse existing analysis flow
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".tsv") as tmp:
        df.to_csv(tmp.name, sep="\t", index=False)
        tsv_path = tmp.name

    try:
        res_df = run_gsea(input_tsv=tsv_path, gmt_name=gmt_name)
    except ValueError as e:
        if "NaN" in str(e) or "nan" in str(e) or "solver cannot continue" in str(e):
            raise HTTPException(
                status_code=400,
                detail="GSEA analysis failed. This usually means the gene symbols in your input don't match any pathways in the selected GMT library. Please verify that your input contains valid gene symbols (e.g., 'BRCA1', 'TP53', 'EGFR') rather than disease names or other identifiers.",
            )
        else:
            raise HTTPException(
                status_code=400, detail=f"GSEA analysis error: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error during GSEA analysis: {str(e)}"
        )
    finally:
        os.unlink(tsv_path)

    return res_df.to_dict(orient="records")
