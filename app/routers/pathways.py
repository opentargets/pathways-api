from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.pathways_service import fetch_pathways

router = APIRouter(prefix="/pathways", tags=["pathways"])

@router.get("/", response_model=list[dict[str, Any]])
async def get_pathways(
    diseaseId: str = Query(..., description="EFO identifier, e.g. EFO_0000094"),
    library:  str = Query(..., description="Folder under data/, e.g. Reactome_Pathways_2024"),
    fdr_lt:   Optional[float] = Query(
        None,
        description="Only include rows with fdr < this value"
    ),
    hide_leading_edge: bool = Query(
        False,
        description="If true, omit the 'propagated_edge' column"
    ),
):
    """
    Retrieve pathway entries for a disease/library, with optional filtering:
    - fdr_lt: float  
    - hide_leading_edge: boolean  
    """
    try:
        return fetch_pathways(
            disease_id=diseaseId,
            library=library,
            fdr_lt=fdr_lt,
            hide_leading_edge=hide_leading_edge,
        )
    except Exception as e:
        # e.g. missing folder, parquet errors
        raise HTTPException(status_code=404, detail=str(e))