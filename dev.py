#!/usr/bin/env python3
"""
Development script for Open Targets Pathways API
Runs both backend and frontend in development mode
"""

import os
import sys
import subprocess
import signal
import time
import threading
from pathlib import Path

def run_command(cmd, cwd=None, env=None):
    """Run a command and return the process"""
    print(f"Running: {' '.join(cmd)}")
    if cwd:
        print(f"Working directory: {cwd}")
    
    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1
    )
    return process

def stream_output(process, prefix):
    """Stream output from a process with a prefix"""
    for line in iter(process.stdout.readline, ''):
        if line:
            print(f"[{prefix}] {line.rstrip()}")
    
    process.stdout.close()
    return_code = process.wait()
    if return_code != 0:
        print(f"[{prefix}] Process exited with code {return_code}")

def setup_environment():
    """Setup environment variables for development"""
    env = os.environ.copy()
    env['APP_ENV'] = 'development'
    return env

def check_dependencies():
    """Check if required dependencies are available"""
    # Check if uv is available
    try:
        subprocess.run(['uv', '--version'], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Error: 'uv' is not available. Please install uv first.")
        print("   Install with: curl -LsSf https://astral.sh/uv/install.sh | sh")
        return False
    
    # Check if npm is available
    try:
        subprocess.run(['npm', '--version'], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Error: 'npm' is not available. Please install Node.js first.")
        return False
    
    return True

def install_frontend_dependencies():
    """Install frontend dependencies if needed"""
    ui_dir = Path("ui")
    if not ui_dir.exists():
        print("❌ Error: 'ui' directory not found")
        return False
    
    node_modules = ui_dir / "node_modules"
    if not node_modules.exists():
        print("📦 Installing frontend dependencies...")
        try:
            subprocess.run(['npm', 'install'], cwd=ui_dir, check=True)
            print("✅ Frontend dependencies installed")
        except subprocess.CalledProcessError as e:
            print(f"❌ Error installing frontend dependencies: {e}")
            return False
    
    return True

def main():
    """Main development script"""
    print("🚀 Starting Open Targets Pathways API Development Environment")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Install frontend dependencies if needed
    if not install_frontend_dependencies():
        sys.exit(1)
    
    # Setup environment
    env = setup_environment()
    
    # Start backend
    print("\n🔧 Starting backend server...")
    backend_cmd = ['uv', 'run', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000']
    backend_process = run_command(backend_cmd, env=env)
    
    # Wait a moment for backend to start
    time.sleep(2)
    
    # Start frontend
    print("\n🎨 Starting frontend development server...")
    frontend_cmd = ['npm', 'run', 'dev']
    frontend_process = run_command(frontend_cmd, cwd='ui', env=env)
    
    # Stream output from both processes
    backend_thread = threading.Thread(
        target=stream_output, 
        args=(backend_process, 'BACKEND')
    )
    frontend_thread = threading.Thread(
        target=stream_output, 
        args=(frontend_process, 'FRONTEND')
    )
    
    backend_thread.daemon = True
    frontend_thread.daemon = True
    
    backend_thread.start()
    frontend_thread.start()
    
    print("\n✅ Development environment started!")
    print("📊 Backend API: http://localhost:8000")
    print("📊 Backend Docs: http://localhost:8000/docs")
    print("🎨 Frontend: http://localhost:5173")
    print("\nPress Ctrl+C to stop all services")
    
    try:
        # Wait for processes to complete
        while backend_process.poll() is None and frontend_process.poll() is None:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down development environment...")
        
        # Terminate processes
        if backend_process.poll() is None:
            backend_process.terminate()
        if frontend_process.poll() is None:
            frontend_process.terminate()
        
        # Wait for processes to terminate
        try:
            backend_process.wait(timeout=5)
            frontend_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("⚠️  Force killing processes...")
            backend_process.kill()
            frontend_process.kill()
        
        print("✅ Development environment stopped")

if __name__ == "__main__":
    main() 