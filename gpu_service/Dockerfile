# Use RunPod's official PyTorch image matching the pod (CUDA 12.1, PyTorch 2.4)
FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Upgrade pip
RUN pip install --upgrade pip

# Copy requirements FIRST to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Exposure port
EXPOSE 8000

# Environment variables
# IMPORTANT: specific to RunPod structure
ENV HF_HOME="/workspace/huggingface_cache"
ENV MAX_QUEUE_SIZE=1
ENV MODEL_ID_IMAGE="stabilityai/stable-diffusion-xl-base-1.0"
ENV MODEL_ID_LLM="Qwen/Qwen2.5-7B-Instruct"

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
