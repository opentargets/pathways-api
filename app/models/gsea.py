from pydantic import BaseModel, Field, field_validator
from typing import List


class Gene(BaseModel):
    """Individual gene with symbol and score."""

    symbol: str = Field(..., description="Gene symbol (e.g., 'BRCA1', 'TP53')")
    globalScore: float = Field(..., description="Gene score for ranking")


class GseaJsonRequest(BaseModel):
    """Request model for JSON-based GSEA endpoint."""

    genes: List[Gene] = Field(
        ..., min_length=1, description="List of genes with symbols and scores"
    )

    @field_validator("genes")
    @classmethod
    def validate_genes_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Genes list cannot be empty")
        return v
