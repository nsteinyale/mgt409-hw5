"""Data types for the Campus Customs agent team.

- AgentName: the five roles.
- AgentReport: what a specialist hands back when asked to do something.
- TeamReport: the Boss's final answer for a run.
- HumanAction: anything a person must approve (payments, discounts, customer promises).
- TeamDeps: shared state for one run (run id, who called whom, budgets).
- AuditEntry: one line of output/audit_trail.json.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, Field

AgentName = Literal["Boss", "Inventory", "Accounting", "Facilities", "CustomerService"]
AGENT_NAMES: tuple[AgentName, ...] = ("Boss", "Inventory", "Accounting", "Facilities", "CustomerService")


class Fact(BaseModel):
    """One checked fact, with the MCP tool it came from, so the Boss can audit it."""

    name: str = Field(description="What the fact is, e.g. 'CC-TEE-WHITE size S on shelf'.")
    value: str = Field(description="The value exactly as the tool returned it.")
    source_tool: str = Field(description="The MCP tool that returned it, e.g. 'check_stock'.")


class HumanAction(BaseModel):
    """Something only a person can approve. Agents propose these; they never carry them out."""

    kind: Literal["payment", "purchase", "discount", "customer_message", "verify", "other"]
    ticket_id: int | None = None
    description: str = Field(description="What to approve and why, in one or two sentences.")
    amount: float | None = Field(default=None, description="Dollar amount involved, if any.")
    pay_kind: Literal["invoice", "rent", "purchase"] | None = Field(
        default=None, description="For payment/purchase only: what is being paid."
    )
    ref_id: int | None = Field(
        default=None, description="For payment/purchase only: the invoice id, lease id, or vendor id (purchase)."
    )


class AgentReport(BaseModel):
    """What a specialist (or the Boss, when asked by another agent) returns."""

    agent: AgentName
    ticket_ids: list[int] = Field(default_factory=list)
    summary: str = Field(description="Two or three sentences: the answer to the task you were given.")
    facts: list[Fact] = Field(default_factory=list)
    actions_taken: list[str] = Field(default_factory=list, description="Tool writes you made, e.g. notes added.")
    needs_human: list[HumanAction] = Field(default_factory=list)
    blocked_reason: str | None = Field(default=None, description="Why the task can't move forward, if it can't.")
    customer_message_draft: str | None = Field(default=None, description="CustomerService only: the draft reply.")


class TicketDecision(BaseModel):
    ticket_id: int
    handled_by: list[AgentName]
    finding: str = Field(description="What the team found, using tool facts.")
    decision: str = Field(description="What happens next.")
    status_set: Literal["open", "in_progress", "waiting_on_human"]
    customer_message_draft: str | None = None


class TeamReport(BaseModel):
    """The Boss's final answer for one run."""

    shop_date: str
    tickets: list[TicketDecision]
    approvals_needed: list[HumanAction] = Field(default_factory=list)
    cash_balance: float | None = None
    cash_left_if_all_approved: float | None = None
    summary: str


@dataclass
class TeamDeps:
    """Shared by every agent in one run, so limits and the audit trail cover the whole team."""

    run_id: str
    agent: AgentName = "Boss"
    depth: int = 0
    chain: list[AgentName] = field(default_factory=lambda: ["Boss"])
    counters: dict[str, int] = field(default_factory=lambda: {"delegations": 0, "audit_seq": 0})

    def child(self, agent: AgentName) -> "TeamDeps":
        """Deps for a teammate this agent is delegating to (same run, same counters)."""
        return TeamDeps(self.run_id, agent, self.depth + 1, [*self.chain, agent], self.counters)


class AuditEntry(BaseModel):
    """One step of one agent loop, appended to output/audit_trail.json."""

    run_id: str
    seq: int
    logged_at: str
    agent: str  # one of AGENT_NAMES, or "Human: <name>" / "System" for dashboard actions
    depth: int
    chain: list[str]
    step: int
    event: str
    model: str
    detail: dict[str, Any] = Field(default_factory=dict)
    usage: dict[str, int] = Field(default_factory=dict)
