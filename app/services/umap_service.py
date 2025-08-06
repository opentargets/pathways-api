import os
import pandas as pd
import numpy as np
import umap
import hdbscan
from scipy.spatial.distance import pdist, squareform
from fastapi.responses import FileResponse  # optional


def poincare_dist(u, v):
    norm_u = np.linalg.norm(u)
    norm_v = np.linalg.norm(v)
    norm_diff = np.linalg.norm(u - v)
    denom = (1 - norm_u ** 2) * (1 - norm_v ** 2)
    if denom <= 0:
        return float('inf')
    argument = 1 + 2 * (norm_diff ** 2) / denom
    argument = max(argument, 1.0)
    return np.arccosh(argument)


def compute_poincare_distance_matrix(embedding_matrix):
    return squareform(pdist(embedding_matrix, metric=poincare_dist))


def perform_umap_clustering_api(
    disease_id: str,
    library: str,
    n_neighbors: int = 10,
    min_dist: float = 0.5,
    min_cluster_size: int = 12,
    umap_dimensions: int = 2,
    base_data_dir: str = "data/umap_dynamic"
) -> str:
    """
    Perform UMAP and HDBSCAN clustering on embeddings andmetadata for a given disease_id and library.
    Returns path to the resulting TSV file.
    """

    # Ensure folder uses 'diseaseId=' prefix
    folder_name = disease_id
    if not disease_id.startswith("diseaseId="):
        folder_name = f"diseaseId={disease_id}"

    # Updated paths include the library directory
    coordinates_parquet_dir = os.path.join(base_data_dir, "target_embeddings", library, folder_name)
    metadata_parquet_dir = os.path.join(base_data_dir, "target_metadata", library, folder_name)
    output_dir = os.path.join(base_data_dir, "output", library, folder_name)

    # Load parquet datasets from directories
    metadata = pd.read_parquet(metadata_parquet_dir).query("geneticScore.notnull()")
    coords_df = pd.read_parquet(coordinates_parquet_dir)

    # Prepare coordinates
    coords_df = coords_df.rename(columns={coords_df.columns[0]: 'approvedSymbol'})
    coord_columns = coords_df.columns[1:]
    coords_df[coord_columns] = coords_df[coord_columns].astype(float)

    # Merge embeddings with metadata
    merged_df = pd.merge(metadata, coords_df, on='approvedSymbol', how='inner')

    # Validate embedding norms (Poincaré ball condition)
    embedding_matrix = merged_df[coord_columns].values
    norms = np.linalg.norm(embedding_matrix, axis=1)
    if np.any(norms >= 1):
        raise ValueError("Some embeddings lie outside the Poincaré ball (norm >= 1).")

    # Compute Poincaré distances
    distance_matrix = compute_poincare_distance_matrix(embedding_matrix)

    # UMAP dimensionality reduction
    reducer = umap.UMAP(
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        n_components=umap_dimensions,
        metric='precomputed',
        random_state=42
    )
    embedding_umap = reducer.fit_transform(distance_matrix)

    # HDBSCAN clustering
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=1,
        metric='precomputed'
    )
    cluster_labels = clusterer.fit_predict(distance_matrix)

    # Append UMAP and cluster labels
    for dim in range(umap_dimensions):
        merged_df[f'UMAP {dim+1}'] = embedding_umap[:, dim]
    merged_df['cluster'] = cluster_labels

    # Drop original embedding columns
    output_df = merged_df.drop(columns=coord_columns)

    # Save result to TSV
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"{disease_id}_clusters.tsv")
    output_df.to_csv(output_file, sep='\t', index=False)

    return output_file