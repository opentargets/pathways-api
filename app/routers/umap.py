import os
import pandas as pd
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import HTMLResponse
from app.services.umap_service import perform_umap_clustering_api

router = APIRouter()

@router.get("/run", response_class=HTMLResponse)
def run_umap(
    disease_id: str = Query(..., description="The disease ID (e.g., 'EFO_0000094')"),
    library: str = Query(..., description="The library name (e.g., 'open_targets')"),
    n_neighbors: int = Query(10),
    min_dist: float = Query(0.5),
    min_cluster_size: int = Query(12),
    umap_dimensions: int = Query(2)
):
    try:
        # Run UMAP & clustering
        output_file = perform_umap_clustering_api(
            disease_id=disease_id,
            library=library,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            min_cluster_size=min_cluster_size,
            umap_dimensions=umap_dimensions
        )

        # Read TSV into a DataFrame
        df = pd.read_csv(output_file, sep='\t')

        # Convert to HTML table (with some basic styling)
        html = df.to_html(index=False, classes="table table-bordered table-striped")

        # Wrap in a basic HTML template
        html_template = f"""
        <html>
            <head>
                <title>UMAP Clustering Results</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        margin: 40px;
                    }}
                    .table {{
                        border-collapse: collapse;
                        width: 100%;
                    }}
                    .table th, .table td {{
                        border: 1px solid #ddd;
                        padding: 8px;
                    }}
                    .table th {{
                        background-color: #f2f2f2;
                        text-align: left;
                    }}
                    .table-striped tr:nth-child(even) {{
                        background-color: #f9f9f9;
                    }}
                </style>
            </head>
            <body>
                <h2>UMAP Clustering Results for <code>{disease_id}</code></h2>
                {html}
            </body>
        </html>
        """
        return HTMLResponse(content=html_template)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
