from fastapi import HTTPException
import pandas as pd


def validate_gsea_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and normalize a DataFrame for GSEA analysis.

    Args:
        df: Input DataFrame to validate

    Returns:
        Normalized DataFrame with 'symbol' and 'globalScore' columns, sorted by score

    Raises:
        HTTPException: If validation fails
    """
    # Handle unnamed columns (legacy support)
    if set(df.columns) == set(range(len(df.columns))):
        df = df.rename(columns={0: "symbol", 1: "globalScore"})

    # Validate required columns
    if not {"symbol", "globalScore"}.issubset(df.columns):
        raise HTTPException(
            status_code=400,
            detail="Input must contain 'symbol' and 'globalScore' columns",
        )

    # Extract only required columns and sort
    df = df[["symbol", "globalScore"]].copy()
    df = df.sort_values("globalScore", ascending=False)

    return df


def handle_gsea_error(error: Exception) -> HTTPException:
    """
    Convert GSEA analysis errors into user-friendly HTTP exceptions.

    Args:
        error: The exception that occurred during GSEA analysis

    Returns:
        HTTPException with appropriate status code and message
    """
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
        else:
            return HTTPException(
                status_code=400, detail=f"GSEA analysis error: {str(error)}"
            )
    else:
        return HTTPException(
            status_code=500,
            detail=f"Unexpected error during GSEA analysis: {str(error)}",
        )
