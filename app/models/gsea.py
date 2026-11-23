from enum import Enum
from typing import List

from pydantic import BaseModel, Field, model_validator


class Gene(BaseModel):
    """Individual gene with Ensembl ID or symbol, and score."""

    id: str | None = Field(None, description="Ensembl ID (e.g., 'ENSG00000012048')")
    symbol: str | None = Field(
        None, description="Gene symbol (e.g., 'BRCA1', 'TP53'), used if there is no id"
    )
    globalScore: float = Field(..., description="Gene score for ranking")

    @model_validator(mode="after")
    def check_has_id_or_symbol(self):
        if not (self.id or self.symbol):
            raise ValueError("a gene needs an id or a symbol")
        return self


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
    GOBiologicalProcess = "go_biological_process"
    GOMolecularFunction = "go_molecular_function"
    GOCellularComponent = "go_cellular_component"
    Reactome = "reactome"
    ChEMBLTargetClass = "chembl_target_class"

    @classmethod
    def _missing_(cls, value):
        """Accept the names used before the year was dropped, e.g. reactome_2025."""
        if isinstance(value, str) and value.endswith("_2025"):
            return cls._value2member_map_.get(value.removesuffix("_2025"))
        return None


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
