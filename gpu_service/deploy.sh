#!/bin/bash
# Fablean GPU Service Deployment Script
# Run this in the RunPod web terminal

set -e

echo "=========================================="
echo "  Fablean GPU Service Deployment"
echo "=========================================="

# 1. Create workspace
mkdir -p /workspace/gpu_service
cd /workspace/gpu_service

# 2. Write app.py
cat > app.py << 'APPEOF'

import os
import torch
import json
import asyncio
import base64
from io import BytesIO
from typing import Optional, List, Dict, Any, Union
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from diffusers import StableDiffusionXLPipeline, EulerAncestralDiscreteScheduler
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, BitsAndBytesConfig

# Global State
models = {}
gpu_lock = asyncio.Semaphore(1)

# Env Config
MODEL_ID_IMAGE = os.getenv("MODEL_ID_IMAGE", "stabilityai/stable-diffusion-xl-base-1.0")
LORA_ID_SILHOUETTE = "DoctorDiffusion/doctor-diffusion-s-stylized-silhouette-photography-xl-lora"
MODEL_ID_LLM = os.getenv("MODEL_ID_LLM", "Qwen/Qwen2.5-7B-Instruct")

# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------

class CharacterInfo(BaseModel):
    character_id: str
    token: str
    signature: str
    default_seed: Optional[int] = None

class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Scene prompt describing environment/action")
    negative_prompt: Optional[str] = None
    width: int = 832
    height: int = 832
    steps: int = 28
    cfg: float = 6.0
    seed: Optional[int] = 42
    lora_scale: float = 0.75
    character_id: Optional[str] = None
    character_signature: Optional[str] = None
    framing: str = Field("", description="Optional framing directive (e.g. full_body_centered_30pct)")

class LLMDirectRequest(BaseModel):
    chapter_id: str
    text: str
    known_characters: List[CharacterInfo] = []
    n_scenes: int = 10

class WritingAnalyzeRequest(BaseModel):
    text: str = Field(..., description="Chapter text to analyze for grammar and characters")

# -----------------------------------------------------------------------------
# Model Loading / Lifecycle
# -----------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading models... maximize VRAM usage!")
    
    # 1. Load SDXL
    print(f"Loading SDXL: {MODEL_ID_IMAGE}")
    try:
        scheduler = EulerAncestralDiscreteScheduler.from_pretrained(MODEL_ID_IMAGE, subfolder="scheduler")
        image_pipe = StableDiffusionXLPipeline.from_pretrained(
            MODEL_ID_IMAGE,
            torch_dtype=torch.float16,
            scheduler=scheduler,
            variant="fp16",
            use_safetensors=True
        )
        image_pipe.to("cuda")
        
        # Load LoRA
        print(f"Loading LoRA: {LORA_ID_SILHOUETTE}")
        image_pipe.load_lora_weights(LORA_ID_SILHOUETTE, adapter_name="silhouette")
        models["image"] = image_pipe
    except Exception as e:
        print(f"Failed to load SDXL: {e}")
        raise e

    # 2. Load LLM (Qwen)
    print(f"Loading LLM: {MODEL_ID_LLM} in 8-bit quantization")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID_LLM)
        
        # Use 8-bit quantization to save massive VRAM, keeping SDXL alive
        quantization_config = BitsAndBytesConfig(load_in_8bit=True)
        
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID_LLM,
            device_map="auto",
            quantization_config=quantization_config,
            trust_remote_code=True
        )
        llm_pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)
        models["llm"] = llm_pipe
        models["tokenizer"] = tokenizer
    except Exception as e:
        print(f"Failed to load LLM: {e}")
        raise e

    print("All models loaded successfully!")
    yield
    print("Shutting down...")
    models.clear()
    torch.cuda.empty_cache()

app = FastAPI(lifespan=lifespan, title="Fablean GPU Service")

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

CHARACTER_REGISTRY = {
    "raze": {
        "token": "char_raze", 
        "signature": "same hood shape, long coat mid-calf, slim build",
        "default_seed": 1234
    }
}

FRAMING_PROMPTS = {
    "full_body_centered_30pct": "full body, centered composition, same distance, character occupies about 30 percent of frame height",
    "mid_shot": "mid shot, waist up, centered, calm composition",
    "close": "close up silhouette, shoulders and head, centered, calm composition"
}

GLOBAL_STYLE = "sli artstyle, stylized silhouette photography, infront of, vibrant cinematic colors, colorful background, vibrant colorful soft fog, distant colorful backlight, rim light outlining silhouette, minimal detail, smooth colorful gradients, low noise, moody atmospheric color lighting, no facial features, no clothing texture, simple background"

GLOBAL_NEGATIVE = "black and white, monochrome, grayscale, text, watermark, logo, busy background, harsh noise, detailed face, detailed eyes, detailed skin, neon, graffiti, oversharpen, gritty film grain"

def build_final_prompt(req: ImageGenerateRequest) -> tuple[str, str]:
    parts = [GLOBAL_STYLE]

    if req.character_id:
        char_info = CHARACTER_REGISTRY.get(req.character_id)
        sig = req.character_signature
        if not sig and char_info:
            sig = char_info["signature"]
        if sig:
            token = char_info["token"] if char_info else "character"
            parts.append(f"{token}, {sig}")
    elif req.character_signature:
         parts.append(f"character, {req.character_signature}")

    parts.append(req.prompt)

    if req.framing and req.framing in FRAMING_PROMPTS:
        if req.character_id or req.character_signature or "character" in req.prompt.lower():
            parts.append(FRAMING_PROMPTS[req.framing])

    final_prompt = ", ".join(parts)
    
    final_neg = GLOBAL_NEGATIVE
    if req.negative_prompt:
        final_neg = f"{GLOBAL_NEGATIVE}, {req.negative_prompt}"

    return final_prompt, final_neg

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ready")
async def ready():
    if "image" in models and "llm" in models:
        return {"status": "ok", "models_loaded": True}
    return JSONResponse(status_code=503, content={"status": "loading"})

@app.post("/v1/image/generate")
async def generate_image(req: ImageGenerateRequest):
    if "image" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")

    final_prompt, final_negative = build_final_prompt(req)

    async with gpu_lock:
        print(f"Generating: {final_prompt[:100]}...")
        
        generator = None
        if req.seed is not None:
            generator = torch.Generator("cuda").manual_seed(req.seed)

        def run_inference():
            return models["image"](
                prompt=final_prompt,
                negative_prompt=final_negative,
                width=req.width,
                height=req.height,
                num_inference_steps=req.steps,
                guidance_scale=req.cfg,
                generator=generator,
                cross_attention_kwargs={"scale": req.lora_scale},
            ).images[0]
        
        try:
            image = await asyncio.to_thread(run_inference)
        except Exception as e:
            print(f"Inference failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    
    headers = {
        "X-Final-Prompt": base64.b64encode(final_prompt.encode("utf-8")).decode("utf-8"),
        "X-Seed": str(req.seed)
    }
    
    return Response(content=buffer.getvalue(), media_type="image/png", headers=headers)


@app.post("/v1/llm/direct")
async def direct_llm(req: LLMDirectRequest):
    if "llm" not in models:
        raise HTTPException(status_code=503, detail="LLM not loaded")

    system_msg = (
        "You are a visual director for a reading app. Analyze the text and output specific JSON "
        "describing silhouette scenes. "
        "Output MUST be valid JSON only. No prose. "
        "Each scene must have a stable 'scene_id', 'paragraph_index', 'character_id', 'framing', "
        "'scene_prompt' (visuals only), and 'style_tags'."
    )
    
    user_msg = f"""
    CHAPTER_ID: {req.chapter_id}
    KNOWN_CHARACTERS: {json.dumps([c.model_dump() for c in req.known_characters])}
    TARGET_SCENE_COUNT: {req.n_scenes}
    TEXT_CHUNK:
    {req.text}
    """
    
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg}
    ]
    
    prompt = models["tokenizer"].apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    async with gpu_lock:
        def run_llm():
            try:
                outputs = models["llm"](
                    prompt,
                    max_new_tokens=2048,
                    do_sample=False,
                    temperature=0.1,
                    top_p=0.9,
                    return_full_text=False
                )
                return outputs[0]["generated_text"]
            except Exception as e:
                print(f"LLM Generation Error: {e}")
                raise e
        
        raw_output = await asyncio.to_thread(run_llm)

    try:
        text_to_parse = raw_output
        if "```json" in text_to_parse:
            text_to_parse = text_to_parse.split("```json")[1].split("```")[0]
        elif "```" in text_to_parse:
            parts = text_to_parse.split("```")
            if len(parts) >= 2:
                text_to_parse = parts[1]
        
        text_to_parse = text_to_parse.strip()
        
        idx_brace = text_to_parse.find("{")
        idx_bracket = text_to_parse.find("[")
        
        start_idx = -1
        if idx_brace != -1 and idx_bracket != -1:
            start_idx = min(idx_brace, idx_bracket)
        elif idx_brace != -1:
            start_idx = idx_brace
        elif idx_bracket != -1:
            start_idx = idx_bracket
            
        if start_idx == -1:
            raise ValueError("No JSON object or list found (missing '{' or '[')")
        
        json_obj, _ = json.JSONDecoder().raw_decode(text_to_parse[start_idx:])
        return json_obj
    except Exception as e:
        print(f"LLM Output Parse Error: {raw_output}")
        raise HTTPException(status_code=500, detail=f"LLM failed to return valid JSON: {str(e)}")


WRITING_ASSISTANT_PROMPT = """You are an expert literary editor and story analyst AI.
Analyze the given chapter text and return ONLY valid JSON with this exact structure:
{
  "suggestions": [
    {"original": "exact text snippet with issue", "replacement": "corrected version", "reason": "brief explanation"}
  ],
  "characters": [
    {"name": "Character Name", "importance": "MAIN or SECONDARY", "base_description": "who they are", "visual_tags": ["physical traits from text"]}
  ]
}
Rules:
- Max 8 grammar suggestions. Focus on grammar errors, awkward phrasing, passive voice, repetition.
- Keep the author's voice. Don't rewrite everything.
- Extract EVERY named character. Only include visual details explicitly in text.
- Return ONLY raw JSON. No markdown, no explanation."""

@app.post("/v1/llm/analyze")
async def analyze_writing(req: WritingAnalyzeRequest):
    if "llm" not in models:
        raise HTTPException(status_code=503, detail="LLM not loaded")

    messages = [
        {"role": "system", "content": WRITING_ASSISTANT_PROMPT},
        {"role": "user", "content": f"Analyze this chapter text:\n\n{req.text}"}
    ]

    prompt = models["tokenizer"].apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    async with gpu_lock:
        def run_llm():
            try:
                outputs = models["llm"](
                    prompt,
                    max_new_tokens=2048,
                    do_sample=False,
                    temperature=0.1,
                    top_p=0.9,
                    return_full_text=False
                )
                return outputs[0]["generated_text"]
            except Exception as e:
                print(f"LLM Analyze Error: {e}")
                raise e

        raw_output = await asyncio.to_thread(run_llm)

    try:
        text_to_parse = raw_output
        if "```json" in text_to_parse:
            text_to_parse = text_to_parse.split("```json")[1].split("```")[0]
        elif "```" in text_to_parse:
            parts = text_to_parse.split("```")
            if len(parts) >= 2:
                text_to_parse = parts[1]

        text_to_parse = text_to_parse.strip()
        idx_brace = text_to_parse.find("{")
        if idx_brace == -1:
            raise ValueError("No JSON object found")

        json_obj, _ = json.JSONDecoder().raw_decode(text_to_parse[idx_brace:])
        return json_obj
    except Exception as e:
        print(f"LLM Analyze Parse Error: {raw_output}")
        raise HTTPException(status_code=500, detail=f"LLM failed to return valid JSON: {str(e)}")

# Safe entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
APPEOF

# 3. Write requirements.txt
cat > requirements.txt << 'REQEOF'
fastapi==0.109.0
uvicorn[standard]==0.27.0
torch>=2.1.2
torchvision>=0.16.2
diffusers>=0.29.0
transformers>=4.40.0
accelerate>=0.30.0
huggingface-hub>=0.23.0
safetensors==0.4.2
pydantic==2.6.1
python-multipart==0.0.9
requests==2.31.0
scipy==1.12.0
regex
sentencepiece
protobuf
bitsandbytes>=0.43.0
peft>=0.11.0
REQEOF

echo ""
echo "✅ Source code deployed to /workspace/gpu_service/"
echo ""

# 4. Install dependencies
echo "📦 Installing Python dependencies..."
pip install -q -r requirements.txt 2>&1 | tail -5

echo ""
echo "✅ Dependencies installed!"
echo ""

# 5. Check GPU
echo "🖥️  GPU Info:"
nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader
echo ""

# 6. Start the service
echo "🚀 Starting Fablean GPU Service on port 8000..."
echo "   Models will take 2-5 minutes to load (SDXL + Qwen2.5-7B)"
echo ""
cd /workspace/gpu_service
python -m uvicorn app:app --host 0.0.0.0 --port 8000
