"""
Vercel serverless handler for Finance Dashboard FastAPI backend.
This module imports the FastAPI app and exposes it for Vercel's Python runtime.
"""
import sys
import os
from pathlib import Path

# Add backend directory to path so we can import backend modules
backend_path = str(Path(__file__).parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Override database path to use /tmp for serverless environment
# Must be set BEFORE importing database module
os.environ["FINANCE_DB_PATH"] = "/tmp/finance.db"

# Import the FastAPI app (which handles all initialization)
# The main.py already creates tables and seeds on startup via @app.on_event("startup")
from main import app

# Export the FastAPI app for Vercel
__all__ = ["app"]
