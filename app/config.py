import os
from functools import lru_cache
from pathlib import Path


class BaseConfig:
    APP_NAME = "Open Targets Pathways API"
    DEBUG = False
    CORS_ORIGINS = []
    BASE_DIR = Path(__file__).resolve().parents[0]
    DATA_DIR = BASE_DIR / "data"
    GMT_DIR = DATA_DIR / "gmt"
    DATABASE_PATH = BASE_DIR / "pathways.db"
    MIN_GENE_COL_IDX = 1


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server
        "http://127.0.0.1:5173",  # Vite dev server alternative
        "http://127.0.0.1:5174",  # Vite dev server alternative
        "http://localhost:4173",  # Vite preview server
        "http://127.0.0.1:4173",  # Vite preview server alternative
        "http://localhost:8080",  # Docker local
        "http://localhost:8000",  # Alternative local
    ]


class ProductionConfig(BaseConfig):
    DEBUG = False
    # For Cloud Run, you need to add your actual domain
    CORS_ORIGINS = (
        os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else ["*"]
    )


@lru_cache
def get_config():
    # Check for DEBUG env var first, then APP_ENV
    if os.getenv("DEBUG", "").lower() == "true":
        return DevelopmentConfig

    env = os.getenv("APP_ENV", "development")
    if env == "production":
        return ProductionConfig
    return DevelopmentConfig
