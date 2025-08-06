import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse
from app.config import get_config
from app.routers.pathways import router as pathways_router
from app.routers.umap_router import router 

import logging

logger = logging.getLogger(__name__)
config = get_config()

app = FastAPI(debug=config.DEBUG)

# Add CORS middleware with flexible configuration for development
if config.DEBUG:
    # In development, allow all localhost origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # In production, use configured origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(pathways_router)
app.include_router(router, prefix="/umap")


# Mount static files for the React app
app.mount("/assets", StaticFiles(directory="ui/dist/assets"), name="assets")

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
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.get("/ui/{path:path}")
async def serve_react_app(path: str):
    """
    Serve the React application. This catch-all route handles all UI routes
    and serves the React app's index.html for client-side routing.
    """
    if path.startswith("assets/"):
        raise StarletteHTTPException(status_code=404, detail="Asset not found")
    
    index_path = "ui/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise StarletteHTTPException(status_code=404, detail="React app not built")


@app.get("/ui")
async def serve_react_app_root():
    """
    Serve the React application at the root UI path.
    """
    index_path = "ui/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise StarletteHTTPException(status_code=404, detail="React app not built")
