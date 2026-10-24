"""Model, Portkey and limit settings shared by all five agents."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings
from pydantic_ai.usage import UsageLimits

BACKEND = Path(__file__).resolve().parent
HW_ROOT = BACKEND.parent
PROMPTS = BACKEND / "prompts"
AUDIT_PATH = HW_ROOT / "output" / "audit_trail.json"
MCP_SERVER = HW_ROOT / "mcp_server" / "server.py"


def _mcp_python() -> Path:
    """Python that runs the MCP server: $MCP_PYTHON, else a venv in mcp_server/, else this same Python
    (one shared environment from the top-level requirements.txt is enough)."""
    if os.getenv("MCP_PYTHON"):
        return Path(os.environ["MCP_PYTHON"])
    for venv_py in (HW_ROOT / "mcp_server" / ".venv" / "Scripts" / "python.exe",
                    HW_ROOT / "mcp_server" / ".venv" / "bin" / "python"):
        if venv_py.exists():
            return venv_py
    return Path(sys.executable)


MCP_PYTHON = _mcp_python()

# .env in this homework folder, or the course folder above it.
load_dotenv(HW_ROOT / ".env")
load_dotenv(HW_ROOT.parent / ".env")

# The assignment allows exactly one model, for every agent.
MODEL_NAME = "gpt-6-luna"
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"

# Token and loop limits, shared by the whole team in a run.
MAX_OUTPUT_TOKENS = 1500   # per model response
MAX_DEPTH = 2              # Boss -> specialist -> one more teammate, no deeper
MAX_DELEGATIONS = 10       # ask_agent calls per run, across all agents
MAX_TASK_CHARS = 800       # length of a delegated task
RUN_LIMITS = UsageLimits(request_limit=45, tool_calls_limit=80, total_tokens_limit=250_000)
AUDIT_TEXT_CHARS = 1500    # long tool results and messages are cut to this in the audit trail

MODEL_SETTINGS = ModelSettings(max_tokens=MAX_OUTPUT_TOKENS)


def build_model() -> OpenAIResponsesModel:
    api_key = os.getenv("PORTKEY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("PORTKEY_API_KEY is not set. Add it to a .env file.")
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=PORTKEY_BASE_URL,
        default_headers={"x-portkey-provider": "openai"},
        timeout=90,
        max_retries=2,
    )
    return OpenAIResponsesModel(MODEL_NAME, provider=OpenAIProvider(openai_client=client))
