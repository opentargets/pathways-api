# Makefile for Open Targets Pathways API
# Provides convenient commands for development

.PHONY: help start dev ui start api dev install-deps clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make start dev ui    - Start the development UI server"
	@echo "  make start api dev   - Start FastAPI dev server with built UI"
	@echo "  make install-deps    - Install all dependencies (backend and frontend)"
	@echo "  make clean           - Clean up node_modules and cache"
	@echo "  make help            - Show this help message"

# Start development UI
start dev ui:
	@echo "🎨 Starting development UI..."
	@if [ ! -d "ui/node_modules" ]; then \
		echo "📦 Installing frontend dependencies first..."; \
		cd ui && npm install && cd ..; \
	fi
	@echo "🚀 Starting Vite development server..."
	@cd ui && npm run dev

# Start FastAPI development server with built UI
start api dev:
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