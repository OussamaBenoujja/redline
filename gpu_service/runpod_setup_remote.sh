#!/bin/bash
set -e

# Setup script for RunPod A40 instance
# This runs INSIDE the pod to set up the environment and run the app.

echo ">>> Setting up Fablean GPU Service on RunPod..."

# Navigate to project dir (important!)
cd /workspace/gpu_service

# 1. Update system dependency if needed (apt-get)
# RunPod images are usually minimal. We might need some libs for OpenCV or similar if diffusers needs it.
apt-get update && apt-get install -y libglx-mesa0 libgl1 psmisc

# 2. Setup Persistent Cache
mkdir -p /workspace/huggingface_cache
export HF_HOME="/workspace/huggingface_cache"

# Fix for bitsandbytes on RunPod
export LD_LIBRARY_PATH="/usr/local/cuda/lib64:$LD_LIBRARY_PATH"

# 3. Virtual Environment
# Ubuntu 24.04 enforces PEP 668 (externally managed environments), so we MUST use a venv.
echo ">>> Creating Virtual Environment..."
apt-get install -y python3-venv
python3 -m venv venv
source venv/bin/activate

echo ">>> Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Limit Queue for Safety
export MAX_QUEUE_SIZE=1

# 4. START/RESTART APP
# Check if uvicorn is running on port 8000 and kill it
echo ">>> Killing any existing process on port 8000..."
fuser -k 8000/tcp || true
sleep 2

# Start the new instance
echo ">>> Starting FastAPI Server..."
# python app.py  # This runs uvicorn
# Better to use uvicorn directly for production-like behavior, but app.py has the logic.
# The user's app.py has `if __name__ == "__main__": uvicorn.run(...)`
source venv/bin/activate
nohup python app.py > app.log 2>&1 &
echo "Server started in background. Logs at app.log"

