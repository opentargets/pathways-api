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
RUN uv sync --frozen

# Copy application code
COPY app/ ./app/

# Copy built frontend from GitHub Actions build
COPY ui/dist ./ui/dist

# Create startup script that properly handles runtime PORT variable
RUN echo '#!/bin/sh\n\
PORT="${PORT:-8080}"\n\
echo "Starting server on port $PORT"\n\
exec /app/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$PORT"' > /app/start.sh && \
  chmod +x /app/start.sh

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/ || exit 1

# Run the application
CMD ["/app/start.sh"]
