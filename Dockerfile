# Multi-stage build for production
FROM node:20-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/ui

# Copy package files
COPY ui/package.json ui/package-lock.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY ui/ ./

# Build the frontend
RUN npm run build

# Python backend stage
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
  curl \
  build-essential \
  gcc \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy Python dependencies and README
COPY pyproject.toml uv.lock README.md ./

# Install Python dependencies
RUN uv sync --frozen --no-cache

# Copy application code
COPY app/ ./app/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Run the application
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
