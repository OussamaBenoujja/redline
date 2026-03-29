#!/usr/bin/env bash
set -euo pipefail

# Run from anywhere on the pod:
#   bash /redline/gpu_service/runpod_flux_setup.sh
#
# Requirements before running:
# 1) You have accepted access to black-forest-labs/FLUX.1-dev on Hugging Face.
# 2) Provide a valid HF token either as first arg or env var:
#      bash /redline/gpu_service/runpod_flux_setup.sh hf_xxx
#      or
#      export HF_TOKEN="hf_xxx"; bash /redline/gpu_service/runpod_flux_setup.sh

REPO_URL="https://github.com/OussamaBenoujja/redline"
REPO_ROOT_DIR="/redline"
REPO_GPU_DIR="$REPO_ROOT_DIR/gpu_service"
HF_TOKEN="${HF_TOKEN:-${1:-}}"

echo "[0/9] Ensure repository is cloned and up to date..."
if [[ ! -d "$REPO_ROOT_DIR/.git" ]]; then
  rm -rf "$REPO_ROOT_DIR"
  git clone "$REPO_URL" "$REPO_ROOT_DIR"
else
  git -C "$REPO_ROOT_DIR" fetch --all --prune
  git -C "$REPO_ROOT_DIR" checkout main
  git -C "$REPO_ROOT_DIR" pull --ff-only origin main
fi

if [[ ! -d "$REPO_GPU_DIR" ]]; then
  echo "ERROR: Expected directory not found after clone/pull: $REPO_GPU_DIR"
  exit 1
fi

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "ERROR: HF_TOKEN is not set."
  echo "Run one of:"
  echo "  bash /redline/gpu_service/runpod_flux_setup.sh hf_xxx"
  echo "  export HF_TOKEN=\"hf_xxx\"; bash /redline/gpu_service/runpod_flux_setup.sh"
  exit 1
fi

cd "$REPO_GPU_DIR"

echo "[1/9] Stopping old uvicorn process if running..."
pkill -f "uvicorn app:app" || true

echo "[2/9] Recreate venv..."
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate


echo "[3/9] Install python dependencies (non-torch first)..."
python -m pip install -U pip
grep -vE '^(torch|torchvision)' requirements.txt > requirements.no-torch.txt
python -m pip install -r requirements.no-torch.txt

echo "[4/9] Install Blackwell-compatible PyTorch nightly (cu128)..."
python -m pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/nightly/cu128

echo "[5/9] Configure Hugging Face auth + cache paths..."
mkdir -p /workspace/.cache/huggingface
export HF_HOME=/workspace/.cache/huggingface
export HUGGINGFACE_HUB_CACHE=/workspace/.cache/huggingface/hub
export TRANSFORMERS_CACHE=/workspace/.cache/huggingface/transformers
export HF_HUB_ENABLE_HF_TRANSFER=0
export HF_HUB_DISABLE_XET=1

hf auth login --token "$HF_TOKEN" || true
export HUGGINGFACE_HUB_TOKEN="$HF_TOKEN"


echo "[6/9] Optional cleanup of partial Qwen downloads..."
rm -rf /workspace/.cache/huggingface/hub/models--Qwen* || true
rm -rf /root/.cache/huggingface/hub/models--Qwen* || true

echo "[7/9] Set runtime models..."
export MODEL_ID_IMAGE="black-forest-labs/FLUX.1-dev"
# Smaller LLM to avoid disk quota issues. Change to Qwen/Qwen2.5-7B-Instruct only if you have enough disk.
export MODEL_ID_LLM="Qwen/Qwen2.5-0.5B-Instruct"

echo "[8/9] Print active runtime configuration..."
echo "REPO_ROOT_DIR=$REPO_ROOT_DIR"
echo "MODEL_ID_IMAGE=$MODEL_ID_IMAGE"
echo "MODEL_ID_LLM=$MODEL_ID_LLM"

echo "[9/9] Launch FastAPI..."
python -m uvicorn app:app --host 0.0.0.0 --port 8000
