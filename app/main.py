from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.config import get_config
from app.models.gsea import GeneSetLibraryEnum
from app.routers import gsea
from app.services.gsea import (
    get_approved_symbols,
    get_symbols,
    load_gene_sets,
    load_library_data,
    load_targets,
)

config = get_config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.config = config
    # Read the release once and keep it in memory for the lifespan of the application
    if not config.RELEASE_PATH:
        raise RuntimeError("RELEASE_PATH is not set")
    targets = load_targets(config.RELEASE_PATH)
    gene_sets = load_gene_sets(config.RELEASE_PATH)
    app.state.approved_symbols = get_approved_symbols(targets)
    app.state.symbols = get_symbols(targets)
    app.state.libraries = {
        library: load_library_data(gene_sets, targets, library)
        for library in GeneSetLibraryEnum
    }
    yield


app = FastAPI(debug=config.DEBUG, lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)

if config.DEBUG:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(gsea.router, prefix="/api", tags=["GSEA"])


@app.get("/")
async def root():
    return {"message": f"Welcome to {config.APP_NAME}"}


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Endpoint not found",
                "detail": f"The requested URL {request.url.path} was not found on the server",
            },
        )
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
