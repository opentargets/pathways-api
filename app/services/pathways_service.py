from typing import Any, List, Optional

from pyspark.sql import DataFrame, Row
from pyspark.sql.functions import col

from app.utils.spark import get_spark_session

BASE_PATH = "data/table_view"

def fetch_pathways(
    disease_id: str,
    library: str,
    fdr_lt: Optional[float] = None,
    hide_leading_edge: bool = False,
) -> List[dict[str, Any]]:
    """
    Load the parquet partition for `library`/`disease_id`,
    apply optional filters, drop `diseaseId` and optional columns,
    and return as list of dicts.
    """
    spark = get_spark_session()
    path = f"{BASE_PATH}/{library}/diseaseId={disease_id}"
    
    # Read the partition
    df: DataFrame = spark.read.parquet(path)
    
    # --- ALWAYS DROP the partition column so it doesn't appear in output ---
    if "diseaseId" in df.columns:
        df = df.drop("diseaseId")
    
    # Optional filtering
    if fdr_lt is not None:
        df = df.filter(col("FDR") < fdr_lt)
    
    # Optional column drop
    if hide_leading_edge and "Leading edge genes" in df.columns:
        df = df.drop("Leading edge genes")
    
    # Collect and convert each Row to a native dict
    rows: list[Row] = df.collect()
    return [row.asDict(recursive=True) for row in rows]
