from contextlib import asynccontextmanager

import duckdb
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.config import get_config
from app.models.gsea import GeneSetLibraryEnum
from app.routers import gsea
from app.services.gsea import get_approved_symbols, load_library_data

config = get_config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.config = config
    with duckdb.connect(config.DATABASE_PATH, read_only=True) as con:
        app.state.approved_symbols = get_approved_symbols(con)
        app.state.libraries = {
            library: load_library_data(con, library) for library in GeneSetLibraryEnum
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
