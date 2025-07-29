from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse
from app.config import get_config
from app.routers.pathways import router as pathways_router

import logging

logger = logging.getLogger(__name__)
config = get_config()

app = FastAPI(debug=config.DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pathways_router)


@app.get("/")
async def root():
    return {"message": f"Welcome to {config.APP_NAME}"}

@app.get("/analysis")
async def analysis(request: Request):
    return []


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
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )
