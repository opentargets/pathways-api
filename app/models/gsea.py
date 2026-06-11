from enum import Enum
from typing import List

from pydantic import BaseModel, Field


class Gene(BaseModel):
    """Individual gene with symbol and score."""

    symbol: str = Field(..., description="Gene symbol (e.g., 'BRCA1', 'TP53')")
    globalScore: float = Field(..., description="Gene score for ranking")


class GseaJsonRequest(BaseModel):
    """Request model for JSON-based GSEA endpoint."""

    genes: List[Gene] = Field(
        ..., min_length=1, description="List of genes with symbols and scores"
    )

    # @field_validator("genes")
    # @classmethod
    # def validate_genes_not_empty(cls, v):
    #     if not v or len(v) == 0:
    #         raise ValueError("Genes list cannot be empty")
    #     return v


class GeneSetLibraryEnum(str, Enum):
    GOBiologicalProcess2025 = "go_biological_process_2025"
    GOMolecularFunction2025 = "go_molecular_function_2025"
    GOCellularComponent2025 = "go_cellular_component_2025"
    Reactome2025 = "reactome_2025"
    ChEMBLTargetClass = "chembl_target_class"


class OverlapStats(BaseModel):
    library: GeneSetLibraryEnum = Field(..., description="Gene set library used")
    used_count: int = Field(..., description="Number overlapping")
    total_input: int = Field(..., description="Total number of input symbols")
    used_percent: float = Field(
        ..., description="Percentage of input symbols overlapping"
    )


class GseaResult(BaseModel):
    id: str = Field(..., description="Pathway term ID", serialization_alias="ID")
    link: str = Field(..., description="URL to the term", serialization_alias="Link")
    pathway: str = Field(..., description="Pathway name", serialization_alias="Pathway")
    es: float = Field(..., description="Enrichment score", serialization_alias="ES")
    nes: float = Field(
        ..., description="Normalized enrichment score", serialization_alias="NES"
    )
    fdr: float = Field(
        ..., description="False discovery rate", serialization_alias="FDR"
    )
    p_value: float = Field(..., description="p-value", serialization_alias="p-value")
    sidaks_p_value: float = Field(
        ..., description="Sidak's p-value", serialization_alias="Sidak's p-value"
    )
    geneset_size: int = Field(
        ...,
        description="Number of input genes",
        serialization_alias="Number of input genes",
    )
    leading_edge: list[str] = Field(
        ..., description="Leading edge genes", serialization_alias="Leading edge genes"
    )
    pathway_size: int = Field(
        ..., description="Pathway size", serialization_alias="Pathway size"
    )
    pathway_genes: list[str] = Field(
        ..., description="Pathway genes", serialization_alias="Pathway genes"
    )
    parent_pathway: str = Field(
        ..., description="Parent pathway", serialization_alias="Parent pathway"
    )


class GseaJsonResponse(BaseModel):
    results: List[GseaResult] = Field(..., description="List of GSEAresults")
    input_overlap: OverlapStats = Field(..., description="Input overlap statistics")


class GSEADirectionEnum(str, Enum):
    OneSidedPositive = "one_sided_positive"
    OneSidedNegative = "one_sided_negative"
    TwoSided = "two_sided"
