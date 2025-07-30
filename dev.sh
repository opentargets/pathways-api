#!/bin/bash

# Development script for Open Targets Pathways API
# Runs both backend and frontend in development mode

set -e

echo "🚀 Starting Open Targets Pathways API Development Environment"
echo "============================================================"

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "❌ Error: 'uv' is not available. Please install uv first."
    echo "   Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: 'npm' is not available. Please install Node.js first."
    exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "ui/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd ui && npm install && cd ..
    echo "✅ Frontend dependencies installed"
fi

# Function to cleanup processes on exit
cleanup() {
    echo -e "\n🛑 Shutting down development environment..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "✅ Development environment stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "\n🔧 Starting backend server..."
export APP_ENV=development
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "\n🎨 Starting frontend development server..."
cd ui && npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n✅ Development environment started!"
echo "📊 Backend API: http://localhost:8000"
echo "📊 Backend Docs: http://localhost:8000/docs"
echo "🎨 Frontend: http://localhost:5173"
echo -e "\nPress Ctrl+C to stop all services"

# Wait for processes
wait 