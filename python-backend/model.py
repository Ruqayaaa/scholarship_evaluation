import json
import os
import re
import zipfile
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

# ── State ─────────────────────────────────────────────────────────────────────
MODEL_LOADED = False

ps_model = None
ps_tokenizer = None

resume_model = None
resume_tokenizer = None

# ── Paths ─────────────────────────────────────────────────────────────────────
# Override via env vars when running on Colab:
#   PS_ADAPTER_ZIP=/content/drive/MyDrive/ps_lora_v3_final.zip
#   RESUME_ADAPTER_ZIP=/content/drive/MyDrive/resume_grader_adapter.zip
PS_ADAPTER_ZIP = Path(os.environ.get("PS_ADAPTER_ZIP", "C:/Users/ruqay/Downloads/ps_lora_v3_final.zip"))
PS_ADAPTER_DIR = Path(os.environ.get("PS_ADAPTER_DIR", str(Path(__file__).parent / "adapter")))
PS_BASE_MODEL   = "unsloth/llama-3-8b-bnb-4bit"

RESUME_ADAPTER_ZIP = Path(os.environ.get("RESUME_ADAPTER_ZIP", "C:/Users/ruqay/Downloads/resume_grader_adapter.zip"))
RESUME_ADAPTER_DIR = Path(os.environ.get("RESUME_ADAPTER_DIR", str(Path(__file__).parent / "adapter_resume")))
RESUME_BASE_MODEL  = "unsloth/llama-3.2-1b-bnb-4bit"

# ── Criteria ──────────────────────────────────────────────────────────────────
PS_CRITERIA = [
    "interests_and_values",
    "academic_commitment",
    "clarity_of_vision",
    "organization",
    "language_quality",
]

RESUME_CRITERIA = [
    "academic_achievement",
    "leadership_and_extracurriculars",
    "community_service",
    "research_and_work_experience",
    "skills_and_certifications",
    "awards_and_recognition",
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _extract(zip_path: Path, dest: Path):
    if dest.exists() and any(dest.iterdir()):
        print(f"Adapter already extracted at {dest}")
        return
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(dest)
    print(f"Extracted {zip_path.name} → {dest}")


def _load_peft_model(base_model_id: str, adapter_dir: Path):
    use_gpu = torch.cuda.is_available()
    device_label = torch.cuda.get_device_name(0) if use_gpu else "CPU (slow)"
    print(f"  Loading {base_model_id} on {device_label}")

    if use_gpu:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )
        base = AutoModelForCausalLM.from_pretrained(
            base_model_id,
            quantization_config=bnb_config,
            device_map="auto",
        )
    else:
        base = AutoModelForCausalLM.from_pretrained(
            base_model_id,
            device_map="cpu",
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True,
        )

    model = PeftModel.from_pretrained(base, str(adapter_dir))
    model.eval()

    tok = AutoTokenizer.from_pretrained(str(adapter_dir))
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    return model, tok


def load_model():
    global ps_model, ps_tokenizer, resume_model, resume_tokenizer, MODEL_LOADED

    _extract(PS_ADAPTER_ZIP, PS_ADAPTER_DIR)
    _extract(RESUME_ADAPTER_ZIP, RESUME_ADAPTER_DIR)

    print("Loading PS model (LLaMA 3 8B)...")
    ps_model, ps_tokenizer = _load_peft_model(PS_BASE_MODEL, PS_ADAPTER_DIR)

    print("Loading Resume model (LLaMA 3.2 1B)...")
    resume_model, resume_tokenizer = _load_peft_model(RESUME_BASE_MODEL, RESUME_ADAPTER_DIR)

    MODEL_LOADED = True
    print("Both models loaded and ready.")


# ── Inference helpers ─────────────────────────────────────────────────────────
def _generate(model, tokenizer, prompt: str, max_new_tokens: int) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


def _extract_json(raw: str) -> dict:
    text = re.sub(r"^```(?:json)?\n?", "", raw.strip())
    text = re.sub(r"\n?```$", "", text.strip())
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in model output: {raw!r}")
    return json.loads(match.group())


# ── Personal Statement ────────────────────────────────────────────────────────
def score_statement(personal_statement: str) -> dict:
    system = (
        "You are a scholarship evaluation assistant.\n"
        "You evaluate PERSONAL STATEMENTS using a strict rubric and return VALID JSON only.\n"
        'Do not assume missing information. If something is missing, write "Not provided".\n'
        "No text outside JSON. Ensure overall_score equals the sum of criteria scores."
    )
    user = (
        "TASK: personal_statement\n\n"
        "Rubric: Score each criterion 0\u201320. Total must equal sum.\n\n"
        "Personal Statement:\n<<<\n"
        f"{personal_statement}\n"
        ">>>"
    )
    prompt = (
        "<|begin_of_text|>"
        f"<|start_header_id|>system<|end_header_id|>\n\n{system}<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n\n{user}<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>\n\n"
    )

    raw = _generate(ps_model, ps_tokenizer, prompt, max_new_tokens=512)
    print(f"[PS] Raw output: {raw}")

    result = _extract_json(raw)
    print(f"[PS] Parsed JSON keys: {list(result.keys())}")

    # Model wraps criterion scores under a "criteria" key — flatten to top level
    if "criteria" in result and isinstance(result["criteria"], dict):
        result.update(result["criteria"])

    total = sum(int(result.get(k, 0)) for k in PS_CRITERIA)
    result["overall_score"] = total
    result["grade_pct"] = round((total / 100) * 100, 1)

    # Ensure strengths/improvements are always lists
    if not isinstance(result.get("strengths"), list):
        result["strengths"] = []
    if not isinstance(result.get("improvements"), list):
        result["improvements"] = []

    return result


# ── Resume ────────────────────────────────────────────────────────────────────
_RESUME_SYSTEM = """You are a scholarship committee evaluator.
You assess scholarship application RESUMES against a strict 6-criterion rubric.
Each criterion is scored 0-30 (0-10: weak, 11-20: adequate, 21-30: strong).
Return ONLY valid JSON with exactly these keys:
  academic_achievement, leadership_and_extracurriculars, community_service,
  research_and_work_experience, skills_and_certifications, awards_and_recognition,
  overall_score, justification
overall_score MUST equal the sum of the six criteria scores.
Do NOT include any text outside the JSON object."""

_RESUME_USER = """Evaluate the following scholarship application resume using the rubric below.

RUBRIC (each 0-30):
1. academic_achievement          - GPA, honours, academic awards, class rank
2. leadership_and_extracurriculars - club leadership, student orgs, sports, positions
3. community_service             - volunteer hours, social impact, outreach
4. research_and_work_experience  - internships, research, publications, relevant jobs
5. skills_and_certifications     - technical skills, languages, professional certs
6. awards_and_recognition        - scholarships won, competition prizes, recognitions

Scoring bands: 0-10 = not demonstrated / weak | 11-20 = adequate | 21-30 = strong / excellent

RESUME:
<<<
{resume}
>>>

Return valid JSON only. overall_score must equal the sum of all six criteria scores."""


def score_resume(resume_text: str) -> dict:
    messages = [
        {"role": "system", "content": _RESUME_SYSTEM},
        {"role": "user",   "content": _RESUME_USER.format(resume=resume_text)},
    ]
    prompt = resume_tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    raw = _generate(resume_model, resume_tokenizer, prompt, max_new_tokens=400)
    print(f"[Resume] Raw output: {raw}")

    result = _extract_json(raw)
    total = sum(int(result.get(k, 0)) for k in RESUME_CRITERIA)
    result["overall_score"] = total
    return result
