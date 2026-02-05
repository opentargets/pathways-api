from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
import pandas as pd
from pathlib import Path

from app.services.gsea import available_gmt_files, run_gsea

router = APIRouter(prefix="/pathways", tags=["pathways"])


@router.get("")
async def pathways_root():
    """Root endpoint for pathways router."""
    return {
        "endpoints": [
            {"method": "GET", "path": "/pathways/available", "description": "List available GMT libraries"},
            {"method": "POST", "path": "/pathways/gsea", "description": "Run GSEA analysis"},
        ]
    }


@router.get("/available", response_model=list[str])
async def list_libraries():
    """
    Return available GMT libraries under data/gmt (subfolders).
    Example: ["Reactome/reactome2022", "GO/go2022"]
    """
    try:
        return list(available_gmt_files().keys())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gsea", response_model=list[dict[str, Any]])
async def run_gsea_endpoint(
    gmt_name: str = Form(..., description="Library name, e.g. Reactome/reactome2022"),
    processes: int = Form(4, description="Number of CPU processes"),
    file: UploadFile = File(..., description="TSV file with 'symbol' and 'globalScore'")
):
    """
    Run GSEA on an uploaded input file using a chosen GMT library.
    """
    try:
        # Save uploaded file to a temporary path
        tmp_path = Path(f"/tmp/{file.filename}")
        with tmp_path.open("wb") as f:
            f.write(await file.read())

        res_df, _missing_stats = run_gsea(
            input_tsv=tmp_path,
            gmt_name=gmt_name,
            processes=processes,
        )

        # Return as JSON records
        return res_df.to_dict(orient="records")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
