from enum import Enum
from typing import List

from pydantic import BaseModel, Field, field_validator


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


class GeneSetLibraryEnum(str, Enum):
    GOBiologicalProcess2025 = "go_biological_process_2025"
    GOMolecularFunction2025 = "go_molecular_function_2025"
    GOCellularComponent2025 = "go_cellular_component_2025"
    Reactome2025 = "reactome_2025"
    ChEMBLTargetClass = "chembl_target_class"
