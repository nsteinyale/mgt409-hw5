"""FastAPI backend for the Campus Customs dashboard.

Start it from the backend/ folder:
    uvicorn main:app --reload --port 8000
(use .venv\\Scripts\\uvicorn if the venv isn't activated). Interactive docs: http://localhost:8000/docs

Every shop fact and every database change goes through the campus-customs-ops MCP server.
This file has no SQL. The agents only prepare payments; POST /api/approve is the only thing
that moves cash, and it runs after a person clicks Approve.
"""

from __future__ import annotations

import asyncio
import json
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import Client
from fastmcp.client.transports import StdioTransport
from pydantic import BaseModel, Field

from audit import log_human, read_trail
from config import AUDIT_PATH, MCP_PYTHON, MCP_SERVER, MODEL_NAME
from team import new_run_id, run_team

# ---------------------------------------------------------------- MCP client for the routes

_shop: Client | None = None
_shop_lock = asyncio.Lock()


async def shop(tool: str, **args: Any) -> dict:
    """Call one campus-customs-ops tool. Tool errors come back as HTTP 400 with the tool's message."""
    if _shop is None:
        raise HTTPException(503, "MCP server is not connected.")
    async with _shop_lock:
        result = await _shop.call_tool(tool, {k: v for k, v in args.items() if v is not None})
    data = result.structured_content if result.structured_content is not None else result.data
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(400, data["error"])
    return data


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _shop
    _shop = Client(StdioTransport(str(MCP_PYTHON), [str(MCP_SERVER)]))
    async with _shop:
        yield
    _shop = None


app = FastAPI(title="Campus Customs Ops API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- agent runs (one at a time)

RUNS_PATH = AUDIT_PATH.with_name("runs.json")  # survives a --reload restart
RUNS: dict[str, dict[str, Any]] = json.loads(RUNS_PATH.read_text(encoding="utf-8")) if RUNS_PATH.exists() else {}
for _r in RUNS.values():  # a run cut off by a restart can't finish
    if _r["status"] == "running":
        _r.update(status="error", error="Server restarted during the run.")
_run_lock = asyncio.Lock()


def _save_runs() -> None:
    RUNS_PATH.write_text(json.dumps(RUNS, indent=2), encoding="utf-8")


def _busy() -> str | None:
    return next((rid for rid, r in RUNS.items() if r["status"] == "running"), None)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


async def _run_ticket(run_id: str, ticket_id: int) -> None:
    message = (
        f"Work ticket {ticket_id} only; leave the other tickets alone. Read it with get_ticket, get the facts "
        "from the right teammates (only the ones this ticket needs), set its status, leave a note, and tell me "
        "what needs my approval."
    )
    run = RUNS[run_id]
    try:
        async with _run_lock:
            _, report = await run_team(message, run_id=run_id)
        approvals = [
            {**a.model_dump(), "index": i, "status": "pending"}
            for i, a in enumerate(x for x in report.approvals_needed if x.ticket_id in (None, ticket_id))
        ]
        run.update(status="done", report=report.model_dump(), approvals=approvals)
        if not approvals:  # nothing for a person to sign, so the run itself closes the ticket
            await shop("resolve_ticket", ticket_id=ticket_id, resolved_by="System",
                       note=f"Run {run_id} finished with nothing to approve.")
            run["resolved"] = True
    except Exception as exc:  # the audit trail has the step-by-step error
        run.update(status="error", error=f"{type(exc).__name__}: {exc}")
    run["finished_at"] = _now()
    _save_runs()


# ---------------------------------------------------------------- request bodies


class ApproveRequest(BaseModel):
    kind: Literal["invoice", "rent", "purchase"]
    ref_id: int = Field(description="Invoice id, lease id, or vendor id (for a purchase).")
    approved_by: str = Field(min_length=2, description="The person approving. Agent names are refused.")
    amount: float | None = Field(default=None, description="Optional for invoice/rent (must match); required for purchase.")
    ticket_id: int | None = Field(default=None, description="Ticket this payment settles.")
    resolve_ticket: bool = Field(default=True, description="Mark that ticket resolved once paid.")


# ---------------------------------------------------------------- routes


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "model": MODEL_NAME, "mcp_connected": _shop is not None, "running": _busy()}


@app.get("/api/tickets")
async def tickets() -> dict:
    """The tickets and whether each is open or resolved."""
    data = await shop("list_tickets")
    return {
        "tickets": [
            {**t, "state": "resolved" if t["resolved"] else "open",
             "last_run": next((rid for rid, r in reversed(RUNS.items()) if r["ticket_id"] == t["id"]), None)}
            for t in data["tickets"]
        ]
    }


@app.post("/api/tickets/{ticket_id}/run", status_code=202)
async def run_ticket(ticket_id: int) -> dict:
    """Start the agent team on one ticket. Returns a run_id right away; poll /api/runs/{run_id} or /api/events."""
    ticket = await shop("get_ticket", ticket_id=ticket_id)
    if ticket["status"] in ("resolved", "closed"):
        raise HTTPException(409, f"Ticket {ticket_id} is already {ticket['status']}.")
    if busy := _busy():
        raise HTTPException(409, f"Run {busy} is still going; wait for it to finish.")
    run_id = new_run_id()
    RUNS[run_id] = {"run_id": run_id, "ticket_id": ticket_id, "status": "running", "started_at": _now(),
                    "approvals": [], "resolved": False}
    _save_runs()
    asyncio.create_task(_run_ticket(run_id, ticket_id))
    return RUNS[run_id]


@app.get("/api/runs")
async def list_runs() -> dict:
    """Every run since the last reset, newest first (so the board can recover after a refresh)."""
    return {"runs": list(reversed(RUNS.values()))}


def _get_run(run_id: str) -> dict:
    if run_id not in RUNS:
        raise HTTPException(404, f"Run {run_id} not found.")
    return RUNS[run_id]


@app.get("/api/runs/{run_id}")
async def run_status(run_id: str) -> dict:
    """Status of one run, the Boss's TeamReport once it's done, and its approvals (pending / approved / declined)."""
    return _get_run(run_id)


@app.get("/api/runs/{run_id}/agents")
async def run_agents(run_id: str) -> dict:
    """What each agent actually did in this run: tools used, teammates asked, notes written, final summary."""
    _get_run(run_id)
    agents: dict[str, dict[str, Any]] = {}
    for e in read_trail():
        if e["run_id"] != run_id:
            continue
        a = agents.setdefault(e["agent"], {"agent": e["agent"], "turns": 0, "tools": Counter(), "asked": [],
                                           "asked_by": set(), "notes": 0, "summary": "", "needs_human": 0})
        d = e.get("detail", {})
        if e["event"] == "run_start":
            a["turns"] += 1
            if len(e["chain"]) > 1:
                a["asked_by"].add(e["chain"][-2])
        elif e["event"] == "model_response":
            for c in d.get("tool_calls", []):
                if c["tool"] == "ask_agent":
                    a["asked"].append(c["args"].get("agent"))
                elif c["tool"] != "final_result":
                    a["tools"][c["tool"]] += 1
                    a["notes"] += c["tool"] == "add_ticket_note"
        elif e["event"] == "run_end" and isinstance(d.get("output"), dict):
            out = d["output"]
            a["summary"] = out.get("summary", a["summary"])
            a["needs_human"] = len(out.get("needs_human") or out.get("approvals_needed") or [])
    order = ["Boss", "Inventory", "Accounting", "Facilities", "CustomerService"]
    return {"run_id": run_id, "agents": [
        {**a, "tools": dict(a["tools"]), "asked_by": sorted(a["asked_by"])}
        for a in sorted(agents.values(), key=lambda x: order.index(x["agent"]) if x["agent"] in order else 9)
    ]}


class DecisionRequest(BaseModel):
    decision: Literal["approve", "decline"]
    approved_by: str = Field(min_length=2, description="The person deciding.")


@app.post("/api/runs/{run_id}/approvals/{index}")
async def decide(run_id: str, index: int, body: DecisionRequest) -> dict:
    """A person approves or declines one item the agents asked for. A payment or purchase is paid here
    (through MCP approve_payment). When every item on the run is approved, the ticket is resolved."""
    run = _get_run(run_id)
    if run["status"] != "done":
        raise HTTPException(409, "The run isn't finished yet.")
    try:
        item = run["approvals"][index]
    except IndexError:
        raise HTTPException(404, f"Approval {index} not found on run {run_id}.")
    if item["status"] != "pending":
        raise HTTPException(409, f"Already {item['status']}.")

    who, payment = " ".join(body.approved_by.split()), None
    if body.decision == "approve" and item["kind"] in ("payment", "purchase"):
        pay_kind, ref_id = item.get("pay_kind"), item.get("ref_id")
        if not (pay_kind and ref_id):  # fall back to what the ticket links to
            t = await shop("get_ticket", ticket_id=run["ticket_id"])
            pay_kind, ref_id = ("invoice", t["invoice_id"]) if t.get("invoice_id") else ("rent", t.get("lease_id"))
        if not ref_id:
            raise HTTPException(400, "This approval doesn't say what to pay; decline it and re-run the ticket.")
        payment = await shop("approve_payment", kind=pay_kind, ref_id=ref_id, approved_by=who,
                             amount=item.get("amount"), ticket_id=run["ticket_id"], resolve_ticket=False)
    item.update(status="approved" if body.decision == "approve" else "declined", decided_by=who,
                decided_at=_now(), payment=payment)
    log_human(f"Human: {who}", f"approval_{item['status']}", {"run_id": run_id, "ticket_id": run["ticket_id"],
              "item": {k: item[k] for k in ("kind", "description", "amount")}, "payment": payment}, run_id=run_id)

    if all(a["status"] != "pending" for a in run["approvals"]):  # a person has decided every item
        n_ok = sum(a["status"] == "approved" for a in run["approvals"])
        n_no = len(run["approvals"]) - n_ok
        await shop("resolve_ticket", ticket_id=run["ticket_id"], resolved_by=who,
                   note=f"Run {run_id}: {n_ok} approved, {n_no} declined by a human.")
        run["resolved"] = True
    _save_runs()
    return {"run": run, "payment": payment, "ticket_resolved": run["resolved"]}


def _simplify(e: dict) -> dict:
    d = e.get("detail", {})
    said, tools = "", []
    if e["event"] == "model_response":
        said = d.get("text", "")
        tools = [{"tool": c["tool"], "args": c["args"]} for c in d.get("tool_calls", []) if c["tool"] != "final_result"]
    elif e["event"] == "run_end":
        out = d.get("output") or {}
        said = out.get("summary", "") if isinstance(out, dict) else str(out)
    elif e["event"].startswith("delegation"):
        said = d.get("task") or d.get("reason") or (d.get("report") or {}).get("summary", "")
        tools = [{"tool": "ask_agent", "args": {"agent": d.get("to")}}]
    elif e["event"] in ("run_start", "user_prompt"):
        said = d.get("task") or d.get("prompt") or ""
    elif e["event"] == "error":
        said = d.get("error", "")
    else:
        said = d.get("summary", "")
    return {"run_id": e["run_id"], "seq": e["seq"], "logged_at": e["logged_at"], "agent": e["agent"],
            "chain": e["chain"], "event": e["event"], "said": said, "tools": tools, "detail": d}


@app.get("/api/events")
async def events(
    limit: int = Query(50, ge=1, le=500),
    run_id: str | None = None,
    ticket_id: int | None = None,
    since_seq: int | None = Query(None, description="Only events after this seq (within run_id), for refreshing."),
) -> dict:
    """Recent agent events, newest first: what each agent said and which tools it used."""
    trail = read_trail()
    if ticket_id is not None:
        ids = {rid for rid, r in RUNS.items() if r["ticket_id"] == ticket_id}
        trail = [e for e in trail if e["run_id"] in ids or f"ticket {ticket_id}" in str(e.get("detail", "")).lower()]
    if run_id:
        trail = [e for e in trail if e["run_id"] == run_id]
        if since_seq is not None:
            trail = [e for e in trail if e["seq"] > since_seq]
    items = [_simplify(e) for e in trail[-limit:]][::-1]
    return {"count": len(items), "events": items}


@app.post("/api/approve")
async def approve(body: ApproveRequest) -> dict:
    """A person approved a payment or purchase: pay it, lower cash, and (optionally) resolve the ticket."""
    result = await shop("approve_payment", **body.model_dump())
    log_human(f"Human: {result['approved_by']}", "payment_approved", result)
    return result


@app.get("/api/cash")
async def cash() -> dict:
    """The current checking balance from cash_accounts."""
    return await shop("get_cash_balance", account="checking")


@app.post("/api/reset")
async def reset() -> dict:
    """Put the working database back to the original values for a fresh run. The audit trail is kept."""
    if busy := _busy():
        raise HTTPException(409, f"Run {busy} is still going; reset after it finishes.")
    result = await shop("reset_database")
    RUNS.clear()
    _save_runs()
    log_human("System", "database_reset", result)
    return result
