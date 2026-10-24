"""Append-only audit trail in output/audit_trail.json.

The file is a JSON array. Every agent-loop step adds one entry; earlier runs are never removed.
If the file is unreadable, it is moved aside (not deleted) and a new array is started.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from typing import Any

from config import AUDIT_PATH, AUDIT_TEXT_CHARS, MODEL_NAME
from models import AuditEntry, TeamDeps

_lock = threading.Lock()


def clip(value: Any, limit: int = AUDIT_TEXT_CHARS) -> Any:
    """Shorten long text so one big tool result can't bloat the trail."""
    if isinstance(value, str):
        return value if len(value) <= limit else value[:limit] + f"... [{len(value) - limit} more chars]"
    if isinstance(value, dict):
        return {k: clip(v, limit) for k, v in value.items()}
    if isinstance(value, list):
        return [clip(v, limit) for v in value]
    return value


def _load() -> list:
    if not AUDIT_PATH.exists():
        return []
    try:
        data = json.loads(AUDIT_PATH.read_text(encoding="utf-8") or "[]")
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    AUDIT_PATH.rename(AUDIT_PATH.with_name(f"audit_trail.corrupt-{stamp}.json"))
    return []


def read_trail() -> list:
    with _lock:
        return _load()


def log_human(actor: str, event: str, detail: dict[str, Any], run_id: str = "dashboard") -> None:
    """A person's action from the dashboard (approve a payment, reset the data) goes in the same trail."""
    with _lock:
        trail = _load()
        entry = AuditEntry(
            run_id=run_id, seq=len(trail) + 1, logged_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            agent=actor, depth=0, chain=[actor], step=0, event=event, model="none (human action)", detail=clip(detail),
        )
        _write(trail + [entry.model_dump()])


def _write(trail: list) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = AUDIT_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(trail, indent=2), encoding="utf-8")
    tmp.replace(AUDIT_PATH)


def log_step(deps: TeamDeps, step: int, event: str, detail: dict[str, Any], usage: Any = None) -> None:
    with _lock:
        deps.counters["audit_seq"] += 1
        entry = AuditEntry(
            run_id=deps.run_id,
            seq=deps.counters["audit_seq"],
            logged_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            agent=deps.agent,
            depth=deps.depth,
            chain=list(deps.chain),
            step=step,
            event=event,
            model=MODEL_NAME,
            detail=clip(detail),
            usage={
                "requests": getattr(usage, "requests", 0),
                "input_tokens": getattr(usage, "input_tokens", 0),
                "output_tokens": getattr(usage, "output_tokens", 0),
                "tool_calls": getattr(usage, "tool_calls", 0),
            },
        )
        _write(_load() + [entry.model_dump()])
