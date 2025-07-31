def build_umap_with_clusters(metadata_cluster_file):
    """
    Builds a 2D UMAP plot from metadata with 'UMAP 1', 'UMAP 2', and 'cluster' columns.
    """
    import pandas as pd
    import plotly.graph_objects as go
    import plotly.express as px

    # Load metadata
    metadata = pd.read_csv(metadata_cluster_file, sep='\t')

    import colorcet as cc  # for colorblind-friendly palettes
    import random

    # Combine multiple colorblind-safe palettes
    safe_colors = (
        cc.glasbey[:25]  # Glasbey is great for many distinguishable categories
    )

    # Shuffle for aesthetics if desired
    random.seed(42)  # ensure reproducibility
    random.shuffle(safe_colors)

    unique_clusters = sorted(metadata['cluster'].unique())
    cluster_color_dict = {
        cluster: ('gainsboro' if cluster == -1 else safe_colors[i % len(safe_colors)])
        for i, cluster in enumerate(unique_clusters)
    }
    metadata['cluster_color'] = metadata['cluster'].map(cluster_color_dict)


    # Build plot
    fig = go.Figure()

    for cluster_id in unique_clusters:
        cluster_df = metadata[metadata['cluster'] == cluster_id]
        cluster_name = cluster_df['clusterNameReactome'].iloc[0] if cluster_id != -1 else 'Noise'
        color = cluster_color_dict[cluster_id]
        legend_name = f"{cluster_name}" if cluster_id != -1 else 'Noise'

        # Marker outline only for drug targets (not visible in legend)
        marker_lines = [
            dict(width=1, color='black') if val != 0 else dict(width=0)
            for val in cluster_df['geneticAD']
        ]

        fig.add_trace(go.Scatter(
            x=cluster_df['UMAP 1'],
            y=cluster_df['UMAP 2'],
            mode='markers',
            name=legend_name,
            marker=dict(
                size=5,
                color=color,
                line=dict(width=0),  # Disable uniform outline to prevent black circles in legend
                opacity=0.7
            ),
            customdata=cluster_df[['cluster', 'clusterNameReactome', 'approvedSymbol']],
            hovertemplate=(
                "Cluster %{customdata[0]}: %{customdata[1]}<br>" +
                "approvedSymbol: %{customdata[2]}<extra></extra>"
            ),
            showlegend=True
        ))

        # Overlay outlines for neuroFlux targets
        # neuroflux_df = cluster_df[cluster_df['neuroFluxTarget'] == 1]
        neuroflux_df = cluster_df[cluster_df['prioritised'] == 1]
        # neuroflux_df = cluster_df[cluster_df['geneticAD'] == 1]
        # neuroflux_df = cluster_df[cluster_df['isDrugTarget'] == 1]
        if not neuroflux_df.empty:
            fig.add_trace(go.Scatter(
                x=neuroflux_df['UMAP 1'],
                y=neuroflux_df['UMAP 2'],
                mode='markers',
                marker=dict(
                    size=5,
                    color='black',
                    line=dict(width=0),
                    opacity=1
                ),
                hoverinfo='skip',
                showlegend=False
            ))

    # Add dummy legend entry for drug targets
    fig.add_trace(go.Scatter(
        x=[None],
        y=[None],
        mode='markers',
        marker=dict(
            symbol='circle-open',
            color='black',
            size=5,
            line=dict(width=1)
        ),
        # name='– drug target (Pharmaprojects)',
        name='– NeuroFlux hit',
        showlegend=True
    ))

    fig.update_layout(
        # title='NeuroFlux genes in Alzheimer disease pathways context (Reactome)',
        xaxis=dict(title='UMAP1', showgrid=False, zeroline=False, constrain='domain', ticks='outside', showline=True, mirror=True),
        yaxis=dict(title='UMAP2', showgrid=False, zeroline=False, scaleanchor='x', scaleratio=1, constrain='domain', ticks='outside', showline=True, mirror=True),
        plot_bgcolor='white',
        paper_bgcolor='white',
        margin=dict(l=40, r=40, t=40, b=40),
        legend=dict(title='Cluster', itemsizing='constant'),
        height=650,
        width=1200,
    )

    return fig

metadata_cluster_file = '/data/umap/Reactome_Pathways_2025_diy_v2/diseaseId=EFO_0000094/input_mtx_dim_neig_dist.tsv'
fig = build_umap_with_clusters(metadata_cluster_file)
fig