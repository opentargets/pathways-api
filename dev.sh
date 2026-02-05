#!/bin/bash

# Local development script for pathways-api

echo "🚀 Starting Pathways API local development environment..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    docker-compose down
    exit
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Check if running in Docker mode or local mode
if [ "$1" = "docker" ]; then
    echo "📦 Running in Docker mode..."
    
    # Build and run with docker-compose
    docker-compose build
    docker-compose up -d
    
    echo "✅ API running at http://localhost:8080"
    echo "📝 Logs: docker-compose logs -f pathways-api"
    
    # Wait for services
    docker-compose logs -f
    
elif [ "$1" = "local" ]; then
    echo "💻 Running in local development mode..."
    
    # Start backend
    echo "🔧 Starting backend..."
    cd /Users/carlos_cruz/projects/ot/pathways-api
    PORT=8080 uvicorn app.main:app --reload --host 0.0.0.0 --port 8080 &
    BACKEND_PID=$!
    
    # Start frontend
    echo "🎨 Starting frontend..."
    cd ui
    npm run dev &
    FRONTEND_PID=$!
    
    echo "✅ Backend running at http://localhost:8080"
    echo "✅ Frontend running at http://localhost:5173"
    
    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
    
else
    echo "Usage: $0 [docker|local]"
    echo "  docker - Run everything in Docker"
    echo "  local  - Run backend and frontend locally"
    exit 1
fi
