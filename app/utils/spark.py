from pyspark.sql import SparkSession

_spark = None

def get_spark_session() -> SparkSession:
    global _spark
    if _spark is None:
        _spark = (
            SparkSession
            .builder
            .appName("PathwaysAPI")
            .config("spark.ui.showConsoleProgress", "false")
            .getOrCreate()
        )
    return _spark
