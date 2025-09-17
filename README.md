# Open Targets Pathways API

**Open Targets Pathways API** is a comprehensive API service for pathway analysis and visualization, providing endpoints for GSEA (Gene Set Enrichment Analysis), pathway hierarchy exploration, and UMAP dimensionality reduction.

## Features

- **GSEA Analysis**: Perform gene set enrichment analysis with multiple pathway databases
- **Pathway Hierarchy**: Explore hierarchical relationships between pathways
- **UMAP Visualization**: Generate UMAP plots for high-dimensional data visualization
- **Interactive UI**: Modern React-based web interface for data exploration
- **RESTful API**: Well-documented API with OpenAPI/Swagger documentation

## Requirements

- **Python 3.12+**
- **Node.js 20+** (for frontend development)
- [**UV**](https://docs.astral.sh/uv/) for Python dependency management
- **Docker** for containerized deployment

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone git@github.com:opentargets/pathways-api.git
   cd pathways-api
   ```

2. **Run with Docker Compose**:
   ```bash
   make compose up
   ```

3. **Access the application**:
   - API: http://localhost:8000
   - UI: http://localhost:8000/ui
   - API Docs: http://localhost:8000/docs

### Development Setup

1. **Install dependencies**:
   ```bash
   make install-deps
   ```

2. **Start development servers**:
   ```bash
   # Start UI development server
   make start dev ui
   
   # In another terminal, start API with built UI
   make start api dev
   ```

## Docker Deployment

### Building the Image

```bash
# Build the Docker image
make docker build

# Or manually
docker build -t pathways-api:latest .
```

### Running the Container

```bash
# Run with Make
make docker run

# Or manually
docker run -d --name pathways-api -p 8000:8000 pathways-api:latest
```

### Using Docker Compose

```bash
# Start all services
make compose up

# Stop all services
make compose down

# View logs
make compose logs
```

## GitHub Releases

This project uses automated GitHub Actions for building and releasing Docker images:

### Automatic Releases

- **On every push to `main`**: Builds and pushes Docker images to GitHub Container Registry
- **On version tags** (`v*`): Creates GitHub releases with Docker images

### Manual Release Process

1. **Update version** in `pyproject.toml`:
   ```toml
   version = "0.2.0"
   ```

2. **Create and push a tag**:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. **GitHub Actions will automatically**:
   - Build multi-architecture Docker images (AMD64, ARM64)
   - Push to `ghcr.io/opentargets/pathways-api`
   - Create a GitHub release with changelog

### Available Docker Images

- `ghcr.io/opentargets/pathways-api:latest` - Latest stable release
- `ghcr.io/opentargets/pathways-api:v0.1.0` - Specific version
- `ghcr.io/opentargets/pathways-api:main` - Latest from main branch

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Available Commands

```bash
# Development
make start dev ui      # Start UI development server
make start api dev     # Start API with built UI
make install-deps      # Install all dependencies
make clean            # Clean up build artifacts

# Docker
make docker build     # Build Docker image
make docker run       # Run Docker container
make docker stop      # Stop Docker container
make docker logs      # Show container logs
make docker push      # Push to registry

# Docker Compose
make compose up       # Start services
make compose down     # Stop services
make compose logs     # Show logs
```

## Configuration

The application can be configured using environment variables:

- `DEBUG`: Enable debug mode (default: `false`)
- `CORS_ORIGINS`: Allowed CORS origins (comma-separated)
- `APP_NAME`: Application name (default: "Pathways API")

## Copyright

Copyright 2014-2024 EMBL - European Bioinformatics Institute, Genentech, GSK, MSD, Pfizer, Sanofi and Wellcome Sanger Institute

This software was developed as part of the Open Targets project. For more information please see: http://www.opentargets.org

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
