"""
LangGraph AI Agent for clinical lab report analysis.
The graph runs three nodes:
  1. classify   — determines status (normal/abnormal) for each parameter
  2. educate    — generates per-parameter educational explanation
  3. summarise  — writes patient-friendly summary + recommendations
"""
import json
from typing import TypedDict, List, Optional, Any
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings


def _get_llm():
    if settings.use_groq:
        from langchain_groq import ChatGroq
        return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3, api_key=settings.GROQ_API_KEY)
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=settings.OPENAI_API_KEY)


# ─── State ────────────────────────────────────────────────────────────────────

class Parameter(TypedDict):
    parameter_name: str
    value: float
    unit: str
    reference_min: Optional[float]
    reference_max: Optional[float]
    status: str
    explanation: Optional[str]


class AgentState(TypedDict):
    parameters: List[Parameter]
    classified: List[Parameter]
    educated: List[Parameter]
    summary_text: str
    recommendation_text: str
    abnormal_count: int


# ─── Reference Range Lookup ───────────────────────────────────────────────────

REFERENCE_RANGES = {
    "hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "hb": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "hgb": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "wbc": {"min": 4000, "max": 11000, "unit": "/μL"},
    "leukosit": {"min": 4000, "max": 11000, "unit": "/μL"},
    "leukocyte": {"min": 4000, "max": 11000, "unit": "/μL"},
    "platelet": {"min": 150000, "max": 400000, "unit": "/μL"},
    "trombosit": {"min": 150000, "max": 400000, "unit": "/μL"},
    "plt": {"min": 150000, "max": 400000, "unit": "/μL"},
    "rbc": {"min": 3.8, "max": 5.8, "unit": "10^6/μL"},
    "eritrosit": {"min": 3.8, "max": 5.8, "unit": "10^6/μL"},
    "hematocrit": {"min": 36.0, "max": 52.0, "unit": "%"},
    "hct": {"min": 36.0, "max": 52.0, "unit": "%"},
    "mcv": {"min": 80.0, "max": 100.0, "unit": "fL"},
    "mch": {"min": 27.0, "max": 33.0, "unit": "pg"},
    "mchc": {"min": 32.0, "max": 36.0, "unit": "g/dL"},
    "ast": {"min": 0, "max": 40, "unit": "U/L"},
    "sgot": {"min": 0, "max": 40, "unit": "U/L"},
    "alt": {"min": 0, "max": 41, "unit": "U/L"},
    "sgpt": {"min": 0, "max": 41, "unit": "U/L"},
    "creatinine": {"min": 0.6, "max": 1.3, "unit": "mg/dL"},
    "kreatinin": {"min": 0.6, "max": 1.3, "unit": "mg/dL"},
    "bun": {"min": 7, "max": 25, "unit": "mg/dL"},
    "ureum": {"min": 15, "max": 45, "unit": "mg/dL"},
    "uric acid": {"min": 2.4, "max": 7.0, "unit": "mg/dL"},
    "asam urat": {"min": 2.4, "max": 7.0, "unit": "mg/dL"},
    "glucose": {"min": 70, "max": 100, "unit": "mg/dL"},
    "glukosa": {"min": 70, "max": 100, "unit": "mg/dL"},
    "gds": {"min": 70, "max": 200, "unit": "mg/dL"},
    "gdp": {"min": 70, "max": 100, "unit": "mg/dL"},
    "hba1c": {"min": 0, "max": 5.7, "unit": "%"},
    "cholesterol": {"min": 0, "max": 200, "unit": "mg/dL"},
    "kolesterol": {"min": 0, "max": 200, "unit": "mg/dL"},
    "triglycerides": {"min": 0, "max": 150, "unit": "mg/dL"},
    "trigliserida": {"min": 0, "max": 150, "unit": "mg/dL"},
    "hdl": {"min": 40, "max": 999, "unit": "mg/dL"},
    "ldl": {"min": 0, "max": 130, "unit": "mg/dL"},
    "sodium": {"min": 136, "max": 145, "unit": "mEq/L"},
    "natrium": {"min": 136, "max": 145, "unit": "mEq/L"},
    "potassium": {"min": 3.5, "max": 5.0, "unit": "mEq/L"},
    "kalium": {"min": 3.5, "max": 5.0, "unit": "mEq/L"},
    "chloride": {"min": 98, "max": 106, "unit": "mEq/L"},
    "klorida": {"min": 98, "max": 106, "unit": "mEq/L"},
    "bilirubin total": {"min": 0, "max": 1.2, "unit": "mg/dL"},
    "bilirubin direct": {"min": 0, "max": 0.3, "unit": "mg/dL"},
    "alkaline phosphatase": {"min": 44, "max": 147, "unit": "U/L"},
    "alp": {"min": 44, "max": 147, "unit": "U/L"},
    "albumin": {"min": 3.5, "max": 5.0, "unit": "g/dL"},
    "protein total": {"min": 6.0, "max": 8.3, "unit": "g/dL"},
    "calcium": {"min": 8.5, "max": 10.5, "unit": "mg/dL"},
    "kalsium": {"min": 8.5, "max": 10.5, "unit": "mg/dL"},
    "tsh": {"min": 0.4, "max": 4.0, "unit": "μIU/mL"},
    "ft4": {"min": 0.8, "max": 1.8, "unit": "ng/dL"},
    "ft3": {"min": 2.3, "max": 4.2, "unit": "pg/mL"},
    "ferritin": {"min": 12, "max": 300, "unit": "ng/mL"},
    "iron": {"min": 60, "max": 170, "unit": "μg/dL"},
    "tibc": {"min": 250, "max": 370, "unit": "μg/dL"},
    "crp": {"min": 0, "max": 10, "unit": "mg/L"},
    "esr": {"min": 0, "max": 20, "unit": "mm/hr"},
    "led": {"min": 0, "max": 20, "unit": "mm/jam"},
}


def lookup_reference(name: str) -> Optional[dict]:
    key = name.lower().strip()
    return REFERENCE_RANGES.get(key)


def classify_value(value: float, ref_min: float, ref_max: float) -> str:
    if ref_max == 999:
        if value < ref_min:
            pct = (ref_min - value) / ref_min * 100
            return "low" if pct >= 20 else "slightly_low"
        return "normal"
    pct_above = (value - ref_max) / ref_max * 100 if value > ref_max else 0
    pct_below = (ref_min - value) / ref_min * 100 if value < ref_min else 0
    if value > ref_max:
        return "high" if pct_above >= 25 else "slightly_high"
    if value < ref_min:
        return "low" if pct_below >= 25 else "slightly_low"
    return "normal"


# ─── Graph Nodes ──────────────────────────────────────────────────────────────

async def classify_node(state: AgentState) -> AgentState:
    """Classify each parameter against reference ranges."""
    classified = []
    for p in state["parameters"]:
        ref = lookup_reference(p["parameter_name"])
        if ref:
            status = classify_value(p["value"], ref["min"], ref["max"])
            classified.append({
                **p,
                "reference_min": ref["min"],
                "reference_max": ref["max"],
                "status": status,
            })
        else:
            classified.append({**p, "status": "normal", "reference_min": None, "reference_max": None})
    return {**state, "classified": classified}


async def educate_node(state: AgentState) -> AgentState:
    """Generate educational explanation for each parameter."""
    if not state["classified"]:
        return {**state, "educated": []}

    params_json = json.dumps(
        [{"name": p["parameter_name"], "value": p["value"], "unit": p.get("unit", ""), "status": p["status"]}
         for p in state["classified"]],
        ensure_ascii=False
    )

    system = """You are a clinical educator. For each lab parameter given, write a SHORT educational explanation (2-3 sentences) in Bahasa Indonesia that explains:
1. What this parameter measures
2. What the current value indicates (normal/high/low)
3. What the patient should know (without diagnosing)

Return ONLY a valid JSON object mapping parameter_name → explanation string. Example:
{"Hemoglobin": "Hemoglobin adalah...", "WBC": "WBC atau leukosit adalah..."}
"""
    response = await _get_llm().ainvoke([
        SystemMessage(content=system),
        HumanMessage(content=f"Parameters:\n{params_json}"),
    ])
    raw = response.content.strip()
    import re
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    try:
        explanations = json.loads(raw)
    except Exception:
        explanations = {}

    educated = []
    for p in state["classified"]:
        explanation = explanations.get(p["parameter_name"]) or explanations.get(p["parameter_name"].lower())
        educated.append({**p, "explanation": explanation})

    return {**state, "educated": educated}


async def summarise_node(state: AgentState) -> AgentState:
    """Generate patient-friendly summary and recommendations."""
    abnormal = [p for p in state["educated"] if p["status"] != "normal"]
    abnormal_count = len(abnormal)

    params_summary = "\n".join([
        f"- {p['parameter_name']}: {p['value']} {p.get('unit','')} ({p['status']})"
        for p in state["educated"]
    ])

    system = """Anda adalah asisten kesehatan yang memberikan penjelasan edukatif hasil laboratorium darah dalam Bahasa Indonesia.
Tugas Anda:
1. Tulis ringkasan singkat (3-4 kalimat) yang mendeskripsikan kondisi keseluruhan hasil lab
2. Tulis rekomendasi tindak lanjut yang aman dan edukatif (3-4 kalimat)

PENTING:
- Jangan memberikan diagnosis penyakit
- Selalu anjurkan konsultasi ke dokter untuk hasil abnormal
- Gunakan bahasa yang mudah dipahami pasien awam
- Tambahkan disclaimer bahwa ini bukan pengganti penilaian dokter

Return ONLY valid JSON:
{"summary": "...", "recommendation": "..."}
"""
    response = await _get_llm().ainvoke([
        SystemMessage(content=system),
        HumanMessage(content=f"Berikut hasil lab:\n{params_summary}"),
    ])
    raw = response.content.strip()
    import re
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    try:
        result = json.loads(raw)
        summary_text = result.get("summary", "")
        recommendation_text = result.get("recommendation", "")
    except Exception:
        summary_text = raw
        recommendation_text = "Harap konsultasikan hasil ini dengan dokter Anda."

    return {
        **state,
        "summary_text": summary_text,
        "recommendation_text": recommendation_text,
        "abnormal_count": abnormal_count,
    }


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_agent() -> Any:
    builder = StateGraph(AgentState)
    builder.add_node("classify", classify_node)
    builder.add_node("educate", educate_node)
    builder.add_node("summarise", summarise_node)
    builder.set_entry_point("classify")
    builder.add_edge("classify", "educate")
    builder.add_edge("educate", "summarise")
    builder.add_edge("summarise", END)
    return builder.compile()


agent_graph = build_agent()


async def _mock_analysis(parameters: list[dict]) -> dict:
    """Mock analysis when no OpenAI key is configured — classify only."""
    classified = []
    for p in parameters:
        ref = lookup_reference(p.get("parameter_name", ""))
        if ref:
            status = classify_value(float(p["value"]), ref["min"], ref["max"])
            classified.append({
                **p,
                "reference_min": ref["min"],
                "reference_max": ref["max"],
                "status": status,
                "explanation": (
                    f"[Demo Mode] {p['parameter_name']} — nilai {p['value']} {p.get('unit','')}, "
                    f"rentang normal {ref['min']}–{ref['max']} {p.get('unit','')}. "
                    "Aktifkan OPENAI_API_KEY untuk mendapatkan penjelasan edukatif lengkap."
                ),
            })
        else:
            classified.append({**p, "status": "normal", "reference_min": None, "reference_max": None, "explanation": None})

    abnormal = [p for p in classified if p["status"] != "normal"]
    return {
        "parameters": classified,
        "summary_text": (
            "[Demo Mode] Beberapa nilai parameter terdeteksi di luar rentang normal. "
            "Tambahkan OPENAI_API_KEY di backend/.env untuk mendapatkan ringkasan klinis bertenaga AI."
        ),
        "recommendation_text": (
            "⚠️ Ini adalah tampilan demo. Aktifkan OPENAI_API_KEY untuk interpretasi AI lengkap. "
            "Selalu konsultasikan hasil laboratorium Anda dengan dokter atau tenaga kesehatan yang merawat Anda."
        ),
        "abnormal_count": len(abnormal),
    }


async def run_analysis(parameters: list[dict]) -> dict:
    """Run the full analysis pipeline and return structured results."""
    if not settings.ai_available:
        return await _mock_analysis(parameters)

    initial_state: AgentState = {
        "parameters": parameters,
        "classified": [],
        "educated": [],
        "summary_text": "",
        "recommendation_text": "",
        "abnormal_count": 0,
    }
    final_state = await agent_graph.ainvoke(initial_state)
    return {
        "parameters": final_state["educated"],
        "summary_text": final_state["summary_text"],
        "recommendation_text": final_state["recommendation_text"],
        "abnormal_count": final_state["abnormal_count"],
    }
