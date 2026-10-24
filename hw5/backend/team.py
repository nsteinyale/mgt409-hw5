"""The Campus Customs agent team: Boss, Inventory, Accounting, Facilities, CustomerService.

- One PydanticAI Agent per role, each with its own prompt (prompts/*.md), the same model
  (gpt-6-luna via Portkey), and an output type from models.py.
- Shop facts come only from the campus-customs-ops MCP server (mcp_server/server.py, over
  data/campus_customs_new.db). Each agent sees only the MCP tools its role needs.
- Full connectivity: every agent has ask_agent(agent, task) and can hand work to any of the
  other four. Loops, depth, delegation count and tokens are capped (config.py).
- Each agent loop runs with agent.iter(); every step is appended to output/audit_trail.json.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from fastmcp import Client
from fastmcp.client.transports import StdioTransport
from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)

from audit import log_step
from config import (
    MAX_DELEGATIONS,
    MAX_DEPTH,
    MAX_TASK_CHARS,
    MCP_PYTHON,
    MCP_SERVER,
    MODEL_SETTINGS,
    PROMPTS,
    RUN_LIMITS,
    build_model,
)
from models import AGENT_NAMES, AgentName, AgentReport, TeamDeps, TeamReport

# Which MCP tools each role may call (least privilege). Only the Boss changes ticket status.
ROLE_TOOLS: dict[AgentName, set[str]] = {
    "Boss": {"get_shop_date", "list_open_tickets", "get_ticket", "set_ticket_status", "add_ticket_note"},
    "Inventory": {"get_shop_date", "get_ticket", "check_stock", "list_stock_by_size", "list_vendors",
                  "get_invoice", "add_ticket_note"},
    "Accounting": {"get_shop_date", "get_ticket", "get_invoice", "list_vendors", "get_cash_balance",
                   "list_payments", "get_pricing", "get_lease", "add_ticket_note"},
    "Facilities": {"get_shop_date", "get_ticket", "get_lease", "list_vendors", "add_ticket_note"},
    "CustomerService": {"get_shop_date", "get_ticket", "check_stock", "list_stock_by_size", "get_pricing",
                        "add_ticket_note"},
}
PROMPT_FILES: dict[AgentName, str] = {
    "Boss": "boss.md",
    "Inventory": "inventory.md",
    "Accounting": "accounting.md",
    "Facilities": "facilities.md",
    "CustomerService": "customer_service.md",
}

# One MCP server process for the whole team, started once per run.
mcp_server = MCPToolset(Client(StdioTransport(str(MCP_PYTHON), [str(MCP_SERVER)])), id="campus-customs-ops")

TEAM_NOTE = (
    "\n\n## Team mechanics\n"
    "- You are {name}. Ask a teammate with `ask_agent(agent, task)`: agent is one of {others}.\n"
    "- A teammate already working on this request (anyone in the current chain) can't be asked again, "
    "and the team has a small delegation budget. Only delegate what is outside your scope.\n"
    "- Ticket notes are written only by the Boss and by teammates the Boss asked directly. If another "
    "teammate asked you, `add_ticket_note` is hidden: put your findings in your report and they get "
    "noted once.\n"
    "- Every MCP tool call and every step you take is written to an audit trail."
)

# Words that mean internal shop business leaked into a customer message.
INTERNAL_TERMS = re.compile(
    r"\b(invoices?|unpaid|vendors?|suppliers?|margins?|unit cost|our cost|at cost|below cost|break[- ]?even|"
    r"Bulldog Print|Elm City|QuickShip|rent|lease|landlord|payments?|paid|cash)\b",
    re.IGNORECASE,
)


def _tool_allowed(ctx: RunContext[TeamDeps], tool_def: Any, allowed: set[str]) -> bool:
    """Role filter, plus: only depth 0-1 agents write notes, so a fact is noted once, not by every helper."""
    if tool_def.name not in allowed:
        return False
    return not (tool_def.name == "add_ticket_note" and ctx.deps.depth > 1)


def _check_drafts(drafts: list[tuple[str, str | None]]) -> None:
    """Customer drafts may not mention invoices, vendors, costs, margins, rent or payments."""
    for label, draft in drafts:
        found = sorted({m.group(0).lower() for m in INTERNAL_TERMS.finditer(draft or "")})
        if found:
            raise ModelRetry(
                f"{label} mentions internal shop details ({', '.join(found)}). Rewrite it for the customer: "
                "say what we have, that we're restocking or reviewing pricing, and that we'll confirm. "
                "Leave out invoices, vendors, payments, costs and margins."
            )


async def ask_agent(ctx: RunContext[TeamDeps], agent: AgentName, task: str) -> dict[str, Any]:
    """Hand a specific task to a teammate and get their report back.

    agent: Boss, Inventory, Accounting, Facilities, or CustomerService (not yourself).
    task: what you need, with the ticket id and exact SKU/size/qty/invoice/lease ids.
    """
    deps = ctx.deps
    step = deps.counters["delegations"] + 1
    refusal = None
    if agent not in AGENT_NAMES:
        refusal = f"Unknown agent {agent!r}."
    elif agent == deps.agent:
        refusal = "You can't delegate to yourself."
    elif agent in deps.chain:
        refusal = f"{agent} is already working on this request ({' -> '.join(deps.chain)}); answer with what you have."
    elif deps.depth >= MAX_DEPTH:
        refusal = f"Delegation depth limit ({MAX_DEPTH}) reached; answer with what you have."
    elif deps.counters["delegations"] >= MAX_DELEGATIONS:
        refusal = f"Team delegation budget ({MAX_DELEGATIONS}) used up; answer with what you have."
    elif len(task) > MAX_TASK_CHARS:
        refusal = f"Task is {len(task)} characters; keep it under {MAX_TASK_CHARS}."
    if refusal:
        log_step(deps, step, "delegation_refused", {"to": agent, "task": task, "reason": refusal}, ctx.usage)
        return {"error": refusal}

    deps.counters["delegations"] += 1
    log_step(deps, step, "delegation_start", {"to": agent, "task": task}, ctx.usage)
    report = await run_agent(agent, task, deps.child(agent), ctx.usage)
    log_step(deps, step, "delegation_end", {"to": agent, "report": report.model_dump()}, ctx.usage)
    return report.model_dump()


def _build_agent(name: AgentName) -> Agent:
    others = ", ".join(a for a in AGENT_NAMES if a != name)
    prompt = (PROMPTS / PROMPT_FILES[name]).read_text(encoding="utf-8") + TEAM_NOTE.format(name=name, others=others)
    allowed = ROLE_TOOLS[name]
    return Agent(
        build_model(),
        name=name,
        instructions=prompt,
        deps_type=TeamDeps,
        output_type=TeamReport if name == "Boss" else AgentReport,
        toolsets=[mcp_server.filtered(lambda ctx, tool_def, allowed=allowed: _tool_allowed(ctx, tool_def, allowed))],
        tools=[ask_agent],
        model_settings=MODEL_SETTINGS,
        retries=2,
    )


AGENTS: dict[AgentName, Agent] = {}


def get_agent(name: AgentName) -> Agent:
    if name not in AGENTS:
        agent = _build_agent(name)

        @agent.output_validator
        def no_internal_details_to_customers(output: Any) -> Any:
            if isinstance(output, TeamReport):
                _check_drafts([(f"Ticket {t.ticket_id} customer draft", t.customer_message_draft) for t in output.tickets])
            else:
                _check_drafts([("customer_message_draft", output.customer_message_draft)])
            return output

        AGENTS[name] = agent
    return AGENTS[name]


def _describe(node: Any) -> tuple[str, dict[str, Any]]:
    """Turn one agent-loop node into an audit event name and details."""
    if Agent.is_user_prompt_node(node):
        return "user_prompt", {"prompt": node.user_prompt}
    if Agent.is_model_request_node(node):
        req: ModelRequest = node.request
        parts = []
        for p in req.parts:
            if isinstance(p, ToolReturnPart):
                parts.append({"tool_result": p.tool_name, "call_id": p.tool_call_id, "content": p.model_response_str()})
            elif isinstance(p, RetryPromptPart):
                parts.append({"retry": p.tool_name, "content": p.model_response()})
            elif isinstance(p, UserPromptPart):
                parts.append({"user_prompt": p.content if isinstance(p.content, str) else str(p.content)})
        return "model_request", {"sending_to_model": parts}
    if Agent.is_call_tools_node(node):
        resp: ModelResponse = node.model_response
        calls = [{"tool": p.tool_name, "args": p.args_as_dict(), "call_id": p.tool_call_id}
                 for p in resp.parts if isinstance(p, ToolCallPart)]
        text = " ".join(p.content for p in resp.parts if isinstance(p, TextPart)).strip()
        return "model_response", {"tool_calls": calls, "text": text, "finish_reason": resp.finish_reason}
    if Agent.is_end_node(node):
        out = node.data.output
        return "run_end", {"output": out.model_dump() if hasattr(out, "model_dump") else out}
    return type(node).__name__, {}


async def run_agent(name: AgentName, task: str, deps: TeamDeps, usage: Any = None):
    """One agent loop. Every node (prompt, model call, tool calls, end) is logged as a step."""
    agent = get_agent(name)
    log_step(deps, 0, "run_start", {"task": task, "mcp_tools_allowed": sorted(ROLE_TOOLS[name])}, usage)
    step = 0
    try:
        async with agent.iter(task, deps=deps, usage=usage, usage_limits=RUN_LIMITS) as run:
            async for node in run:
                step += 1
                event, detail = _describe(node)
                log_step(deps, step, event, detail, run.usage)
        return run.result.output
    except Exception as exc:
        log_step(deps, step + 1, "error", {"error_type": type(exc).__name__, "error": str(exc)}, usage)
        if name == "Boss":
            raise
        return AgentReport(agent=name, summary=f"{name} could not finish: {type(exc).__name__}: {exc}",
                           blocked_reason=str(exc))


def new_run_id() -> str:
    return uuid.uuid4().hex[:12]


async def run_team(message: str, run_id: str | None = None) -> tuple[str, TeamReport]:
    """Start a run at the Boss. The MCP server is started once and shared by all five agents."""
    deps = TeamDeps(run_id=run_id or new_run_id())
    async with mcp_server:
        report = await run_agent("Boss", message, deps)
    return deps.run_id, report
