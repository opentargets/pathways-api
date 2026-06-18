from fastapi import HTTPException


def handle_gsea_error(error: Exception) -> HTTPException:
    error_str = str(error).lower()

    if isinstance(error, ValueError):
        if any(keyword in error_str for keyword in ["nan", "solver cannot continue"]):
            return HTTPException(
                status_code=400,
                detail=(
                    "GSEA analysis failed. This usually means the gene symbols in your input "
                    "don't match any pathways in the selected GMT library. Please verify that "
                    "your input contains valid gene symbols (e.g., 'BRCA1', 'TP53', 'EGFR') "
                    "rather than disease names or other identifiers."
                ),
            )
        return HTTPException(status_code=400, detail=f"GSEA analysis error: {str(error)}")

    return HTTPException(
        status_code=500,
        detail=f"Unexpected error during GSEA analysis: {str(error)}",
    )
