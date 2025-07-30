import os


class BaseConfig:
    APP_NAME = "Open Targets Pathways API"
    DEBUG = False
    CORS_ORIGINS = []


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",  # Vite dev server alternative
        "http://localhost:4173",  # Vite preview server
        "http://127.0.0.1:4173",  # Vite preview server alternative
    ]


class ProductionConfig(BaseConfig):
    DEBUG = False
    CORS_ORIGINS = [""]


def get_config():
    env = os.getenv("APP_ENV", "development")
    if env == "production":
        return ProductionConfig
    return DevelopmentConfig
