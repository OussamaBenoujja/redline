# Fablean GPU Inference Service (Prototype)

This is a standalone FastAPI service designed to run on a single GPU (optimized for RunPod A40). It provides two core functions:
1.  **Image Generation**: SDXL + Silhouette LoRA (Stylized).
2.  **Scene Direction**: Qwen-7B-Instruct to convert text into scene specs.

## Requirements

- Python 3.10+
- CUDA-capable GPU (Recommended: A40, A100, or RTX 3090/4090 with 24GB+ VRAM).
- Docker (for containerized deployment).

## Setup & Run Locally

1.  **Create venv**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # or venv\Scripts\activate on Windows
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run Server**:
    ```bash
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
    ```
    *Note: The first run will download ~15GB of models. Ensure you have stable internet.*

## Run with Docker (Recommended)

1.  **Build**:
    ```bash
    docker build -t fablean-gpu-service .
    ```

2.  **Run**:
    ```bash
    docker run --gpus all -p 8000:8000 -v $(pwd)/cache:/root/.cache/huggingface fablean-gpu-service
    ```


## Deploy to Your Specific RunPod Instance

Since you have SSH access to a running pod (A40, persistent volume at `/workspace`), here is the fastest deployment method:

### 1. Run Deployment Script (Windows)
From PowerShell, pass your RunPod IP and SSH Port as arguments:
```powershell
.\deploy_to_runpod.ps1 -HostIp "194.68.245.199" -Port "22115"
```
This script will:
1.  Connect via SSH and create `/workspace/gpu_service`.
2.  SCP all project files to that directory.
3.  Install system dependencies (gl-libs) on the remote pod.
4.  Install Python dependencies via `pip`.
5.  Start the FastAPI server on port 8000.

### 3. Verify Remote Service
Once the script says the server is running (it might block your terminal showing logs), open a new terminal and test:

```bash
# Tunnel port 8000 to local machine (Optional, for easier testing)
ssh -N -L 8000:localhost:8000 root@149.36.0.94 -p 39161 -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
```

Then you can use `localhost:8000` as if it were local.

### 4. Docker Method (Alternative)
If you prefer building the container on the pod:
```bash
ssh root@194.68.245.199 -p 22115 -i ~/.ssh/id_ed25519
cd /workspace
git clone <repo> # or copy files
docker build -t fablean-gpu -f Dockerfile .
docker run --gpus all -p 8000:8000 -v /workspace/huggingface_cache:/root/.cache/huggingface fablean-gpu
```

## API Usage

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Generate Image (Streaming/Raw PNG)
Generates a silhouette based on the specific style.
```bash
curl -X POST http://localhost:8000/v1/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a lonely knight standing on a cliff edge looking at a distant castle",
    "framing": "full_body_centered_30pct",
    "seed": 12345
  }' \
  --output result.png
```

**Parameters:**
- `prompt`: Scene description.
- `negative_prompt`: (Optional) Override.
- `character_id`: "raze" (or null).
- `character_signature`: (Optional) "tall, wearing specific hat".
- `framing`: `full_body_centered_30pct`, `mid_shot`, or `close`.
- `seed`: Int for deterministic results.

### 3. Director LLM
Analyzes text and returns JSON scene specs.
```bash
curl -X POST http://localhost:8000/v1/llm/direct \
  -H "Content-Type: application/json" \
  -d '{
    "chapter_id": "ch_1",
    "text": "The wind howled through the narrow alleyway. Raze pulled his coat tighter, his silhouette merging with the shadows. He saw a glimmer of light ahead.",
    "known_characters": [
      {"character_id": "raze", "token": "char_raze", "signature": "long coat, hood"}
    ],
    "n_scenes": 2
  }'
```

**Output:** JSON object with a list of `scenes`.
