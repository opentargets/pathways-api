# Makefile for Open Targets Pathways API
# Provides convenient commands for development and production

.PHONY: help start-dev-ui start-api-dev install-deps clean docker-build docker-run docker-stop docker-logs docker-push compose-up compose-down compose-logs

# Default target
help:
	@echo "Available commands:"
	@echo "  Development:"
	@echo "    make start-dev-ui    - Start the development UI server"
	@echo "    make start-api-dev   - Start FastAPI dev server with built UI"
	@echo "    make install-deps    - Install all dependencies (backend and frontend)"
	@echo "    make clean           - Clean up node_modules and cache"
	@echo ""
	@echo "  Docker:"
	@echo "    make docker-build    - Build Docker image"
	@echo "    make docker-run      - Run Docker container"
	@echo "    make docker-stop     - Stop Docker container"
	@echo "    make docker-logs     - Show Docker container logs"
	@echo "    make docker-push     - Push Docker image to registry"
	@echo ""
	@echo "  Docker Compose:"
	@echo "    make compose-up      - Start services with docker-compose"
	@echo "    make compose-down    - Stop services with docker-compose"
	@echo "    make compose-logs    - Show docker-compose logs"
	@echo ""
	@echo "    make help            - Show this help message"

# Start development UI
start-dev-ui:
	@echo "🎨 Starting development UI..."
	@if [ ! -d "ui/node_modules" ]; then \
		echo "📦 Installing frontend dependencies first..."; \
		cd ui && npm install && cd ..; \
	fi
	@echo "🚀 Starting Vite development server..."
	@cd ui && npm run dev

# Start FastAPI development server with built UI
start-api-dev:
	@echo "🔧 Starting FastAPI development server with built UI..."
	@if [ ! -d "ui/node_modules" ]; then \
		echo "📦 Installing frontend dependencies first..."; \
		cd ui && npm install && cd ..; \
	fi
	@echo "🏗️  Building UI for production..."
	@cd ui && npm run build && cd ..
	@echo "🚀 Starting FastAPI development server..."
	@echo "📊 API will be available at: http://localhost:8000"
	@echo "🎨 UI will be available at: http://localhost:8000/ui"
	@echo "📚 API docs will be available at: http://localhost:8000/docs"
	@uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000



# Install all dependencies
install-deps:
	@echo "📦 Installing backend dependencies..."
	@uv sync
	@echo "📦 Installing frontend dependencies..."
	@cd ui && npm install
	@echo "✅ All dependencies installed"

# Clean up
clean:
	@echo "🧹 Cleaning up..."
	@rm -rf ui/node_modules
	@rm -rf ui/dist
	@rm -rf .venv
	@echo "✅ Cleanup complete"

# Docker commands
docker-build:
	@echo "🐳 Building Docker image..."
	@docker build -t pathways-api:latest .
	@echo "✅ Docker image built successfully"

docker-run:
	@echo "🚀 Running Docker container..."
	@docker run -d --name pathways-api -p 8000:8000 pathways-api:latest
	@echo "✅ Container started. Access at http://localhost:8000"

docker-stop:
	@echo "🛑 Stopping Docker container..."
	@docker stop pathways-api || true
	@docker rm pathways-api || true
	@echo "✅ Container stopped and removed"

docker-logs:
	@echo "📋 Showing Docker container logs..."
	@docker logs -f pathways-api

docker-push:
	@echo "📤 Pushing Docker image to registry..."
	@docker tag pathways-api:latest ghcr.io/opentargets/pathways-api:latest
	@docker push ghcr.io/opentargets/pathways-api:latest
	@echo "✅ Image pushed to registry"

# Docker Compose commands
compose-up:
	@echo "🐳 Starting services with docker-compose..."
	@docker-compose up -d
	@echo "✅ Services started. Access at http://localhost:8000"

compose-down:
	@echo "🛑 Stopping services with docker-compose..."
	@docker-compose down
	@echo "✅ Services stopped"

compose-logs:
	@echo "📋 Showing docker-compose logs..."
	@docker-compose logs -f 