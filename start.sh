#!/bin/bash
echo "================================================"
echo "  FinanceHQ - Personal Finance Dashboard"
echo "================================================"
echo ""

# Install Backend
echo "[1/4] Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q
cd ..

# Install Frontend
echo "[2/4] Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# Start Backend
echo "[3/4] Starting backend (port 8000)..."
cd backend
python main.py &
BACKEND_PID=$!
cd ..

sleep 3

# Start Frontend
echo "[4/4] Starting frontend (port 3000)..."
cd frontend
npm run dev

# Cleanup
kill $BACKEND_PID 2>/dev/null
