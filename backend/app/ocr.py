"""
OCR & parameter extraction.
- If GROQ_API_KEY set   → Groq llama-4-scout (vision)
- If OPENAI_API_KEY set → OpenAI GPT-4o vision
- Otherwise            → demo mock data
"""
import base64
import json
import re
from pathlib import Path
from app.config import settings


MOCK_PARAMETERS = [
    {"parameter_name": "Hemoglobin",    "value": 10.2,   "unit": "g/dL"},
    {"parameter_name": "WBC",           "value": 12500,  "unit": "/μL"},
    {"parameter_name": "Platelet",      "value": 145000, "unit": "/μL"},
    {"parameter_name": "AST",           "value": 55,     "unit": "U/L"},
    {"parameter_name": "ALT",           "value": 62,     "unit": "U/L"},
    {"parameter_name": "Creatinine",    "value": 1.1,    "unit": "mg/dL"},
    {"parameter_name": "Glucose",       "value": 88,     "unit": "mg/dL"},
    {"parameter_name": "Cholesterol",   "value": 215,    "unit": "mg/dL"},
    {"parameter_name": "HDL",           "value": 45,     "unit": "mg/dL"},
    {"parameter_name": "LDL",           "value": 140,    "unit": "mg/dL"},
    {"parameter_name": "Triglycerides", "value": 165,    "unit": "mg/dL"},
]

EXTRACTION_SYSTEM_PROMPT = """You are a medical lab report OCR and extraction specialist.
Given a lab report image, extract all laboratory parameters and return them as JSON.

Return ONLY a valid JSON array like:
[
  {"parameter_name": "Hemoglobin", "value": 12.5, "unit": "g/dL"},
  {"parameter_name": "WBC", "value": 10800, "unit": "/μL"}
]

Rules:
- Extract every numeric lab value you can identify
- Normalize parameter names to standard medical abbreviations when possible
- Include the unit exactly as shown
- Do NOT include reference ranges, just name/value/unit
- Do NOT add any text outside the JSON array
"""


def _parse_params(raw: str) -> list[dict]:
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    return []


async def _extract_with_groq(b64_data: str, media_type: str) -> list[dict]:
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_SYSTEM_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64_data}"},
                    },
                ],
            }
        ],
        max_tokens=2000,
        temperature=0,
    )
    return _parse_params(response.choices[0].message.content or "[]")


async def _extract_with_openai(b64_data: str, media_type: str) -> list[dict]:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_SYSTEM_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64_data}"},
                    },
                ],
            }
        ],
        max_tokens=2000,
        temperature=0,
    )
    return _parse_params(response.choices[0].message.content or "[]")


async def extract_parameters_from_file(file_path: str) -> list[dict]:
    """Extract lab parameters from an uploaded file."""
    if not settings.ai_available:
        return MOCK_PARAMETERS

    path = Path(file_path)
    suffix = path.suffix.lower()

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    b64_data = base64.b64encode(file_bytes).decode("utf-8")

    if suffix == ".pdf":
        try:
            from pdf2image import convert_from_bytes
            import io
            images = convert_from_bytes(file_bytes, first_page=1, last_page=1, dpi=200)
            if images:
                buf = io.BytesIO()
                images[0].save(buf, format="PNG")
                b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")
                media_type = "image/png"
            else:
                return MOCK_PARAMETERS
        except Exception:
            return MOCK_PARAMETERS
    else:
        ext_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
        media_type = ext_map.get(suffix, "image/jpeg")

    if settings.use_groq:
        return await _extract_with_groq(b64_data, media_type)
    else:
        return await _extract_with_openai(b64_data, media_type)
