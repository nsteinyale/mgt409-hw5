"""Campus Customs operations MCP server.

Every agent in Homework 5 gets its shop facts from these tools. It works on
data/campus_customs_new.db (the working copy). The original data/campus_customs.db is never touched.

Read tools open the database read-only and only return values stored in it (plus simple
math on them). If a row is missing, they return an "error" field instead of guessing.

Agent write tools are limited to the ticket queue: adding a note and moving a ticket between
open / in_progress / waiting_on_human.

Human-only tools (list_tickets, approve_payment, reset_database) are called by the FastAPI
backend after a person clicks a button. They are not in any agent's tool list
(backend/team.py ROLE_TOOLS), so no agent can move money, resolve a ticket or reset the data.

Run (stdio):  python server.py
"""

from __future__ import annotations

import shutil
import sqlite3
from contextlib import closing
from datetime import date
from pathlib import Path

from fastmcp import FastMCP

HERE = Path(__file__).resolve().parent
DB_PATH = HERE.parent / "data" / "campus_customs_new.db"
ORIGINAL_DB_PATH = HERE.parent / "data" / "campus_customs.db"

# Ticket statuses an agent may set. "closed" is left out on purpose: a human closes tickets.
AGENT_TICKET_STATUSES = ("open", "in_progress", "waiting_on_human")
AGENT_NAMES = ("Boss", "Inventory", "Accounting", "Facilities", "CustomerService")
DONE_STATUSES = ("resolved", "closed")
PAYMENT_KINDS = ("invoice", "rent", "purchase")
MAX_NOTE_CHARS = 600

mcp = FastMCP("campus-customs-ops")


def _connect(write: bool = False) -> sqlite3.Connection:
    """Open the working database. Read tools use read-only mode so they can never change it."""
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")
    mode = "rw" if write else "ro"
    conn = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode={mode}", uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _shop_today(conn: sqlite3.Connection) -> str | None:
    """The shop's "today" lives in desk.date_today; we never use the real clock."""
    row = conn.execute("SELECT date_today FROM desk LIMIT 1").fetchone()
    return row["date_today"] if row else None


def _days_between(start: str, end: str) -> int:
    return (date.fromisoformat(end[:10]) - date.fromisoformat(start[:10])).days


# ---------------------------------------------------------------- shop date


@mcp.tool
def get_shop_date() -> dict:
    """The shop's "today" and desk notes (desk table). Count every due date and delay from this."""
    with closing(_connect()) as conn:
        row = conn.execute("SELECT date_today, notes FROM desk LIMIT 1").fetchone()
    return dict(row) if row else {"error": "No shop date on file."}


# ---------------------------------------------------------------- tickets


@mcp.tool
def list_open_tickets() -> dict:
    """Every ticket that isn't resolved or closed (tickets table): the work queue the Boss splits up."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT id, type, requester, subject, sku, size, qty, lease_id, invoice_id, status, created_at "
            "FROM tickets WHERE status NOT IN ('resolved', 'closed') ORDER BY id"
        ).fetchall()
    return {"count": len(rows), "tickets": [dict(r) for r in rows]}


@mcp.tool
def get_ticket(ticket_id: int) -> dict:
    """One ticket in full, including its notes and the ids it links to (tickets table)."""
    with closing(_connect()) as conn:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    return dict(row) if row else {"error": f"Ticket {ticket_id} not found."}


@mcp.tool
def add_ticket_note(ticket_id: int, author: str, note: str) -> dict:
    """Append a dated note to a ticket (writes tickets.notes). The original text is kept.

    author must be one of the five agent names. Notes are capped at 600 characters.
    """
    author, note = author.strip(), " ".join(note.split())
    if author not in AGENT_NAMES:
        return {"error": f"author must be one of {list(AGENT_NAMES)}."}
    if not note:
        return {"error": "note is empty."}
    if len(note) > MAX_NOTE_CHARS:
        return {"error": f"note is {len(note)} characters; the limit is {MAX_NOTE_CHARS}."}
    with closing(_connect(write=True)) as conn:
        row = conn.execute("SELECT notes FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return {"error": f"Ticket {ticket_id} not found."}
        line = f"[{_shop_today(conn)} {author}] {note}"
        notes = f"{row['notes']}\n{line}" if row["notes"] else line
        with conn:
            conn.execute("UPDATE tickets SET notes = ? WHERE id = ?", (notes, ticket_id))
    return {"ticket_id": ticket_id, "added": line}


@mcp.tool
def set_ticket_status(ticket_id: int, status: str) -> dict:
    """Move a ticket to open, in_progress, or waiting_on_human (writes tickets.status).

    Agents can't close tickets. Use waiting_on_human when a person has to approve a payment,
    a discount, or anything else outside the agents' limits.
    """
    status = status.strip().lower()
    if status not in AGENT_TICKET_STATUSES:
        return {"error": f"status must be one of {list(AGENT_TICKET_STATUSES)}; only a human can resolve or close a ticket."}
    with closing(_connect(write=True)) as conn:
        row = conn.execute("SELECT status FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return {"error": f"Ticket {ticket_id} not found."}
        if row["status"] in DONE_STATUSES:
            return {"error": f"Ticket {ticket_id} is {row['status']}; only a human can reopen it."}
        with conn:
            conn.execute("UPDATE tickets SET status = ? WHERE id = ?", (status, ticket_id))
    return {"ticket_id": ticket_id, "old_status": row["status"], "new_status": status}


# ---------------------------------------------------------------- inventory and pricing


@mcp.tool
def check_stock(sku: str, size: str) -> dict:
    """Shelf count for one SKU in one size (inventory table).

    Use it before promising a customer order, e.g. ticket 101 (CC-TEE-WHITE, size S),
    and to see whether a bulk request like ticket 103 (CC-HOOD-NAVY, size M) can be filled.
    """
    sku, size = sku.strip().upper(), size.strip().upper()
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT sku, name, size, qty, location FROM inventory WHERE sku = ? AND size = ?",
            (sku, size),
        ).fetchone()
        if row is None:
            sizes = [r["size"] for r in conn.execute("SELECT size FROM inventory WHERE sku = ?", (sku,))]
            if sizes:
                return {"error": f"No inventory row for {sku} size {size}.", "sizes_on_file": sizes}
            return {"error": f"SKU {sku} is not in inventory."}
    return {**dict(row), "in_stock": row["qty"] > 0}


@mcp.tool
def list_stock_by_size(sku: str) -> dict:
    """Shelf count for every size of one SKU (inventory table), e.g. other hoodie sizes for ticket 103."""
    sku = sku.strip().upper()
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT size, qty, location FROM inventory WHERE sku = ? ORDER BY rowid", (sku,)
        ).fetchall()
        name = conn.execute("SELECT name FROM inventory WHERE sku = ? LIMIT 1", (sku,)).fetchone()
    if not rows:
        return {"error": f"SKU {sku} is not in inventory."}
    return {"sku": sku, "name": name["name"], "sizes": [dict(r) for r in rows], "total_qty": sum(r["qty"] for r in rows)}


@mcp.tool
def get_pricing(sku: str, qty: int = 1) -> dict:
    """List price and unit cost for a SKU (pricing table), with totals for qty units.

    Use it before answering a discount request, e.g. ticket 103 (20 x CC-HOOD-NAVY):
    unit_cost is the floor, and any price below it loses money.
    """
    sku = sku.strip().upper()
    if qty < 1:
        return {"error": "qty must be at least 1."}
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT sku, unit_cost, list_price FROM pricing WHERE sku = ?", (sku,)
        ).fetchone()
    if row is None:
        return {"error": f"No price on file for {sku}."}
    return {
        **dict(row),
        "qty": qty,
        "list_total": round(row["list_price"] * qty, 2),
        "cost_total": round(row["unit_cost"] * qty, 2),
        "margin_per_unit": round(row["list_price"] - row["unit_cost"], 2),
    }


# ---------------------------------------------------------------- vendors and invoices


@mcp.tool
def list_vendors() -> dict:
    """Every supplier with its specialty and lead time in days (vendors table)."""
    with closing(_connect()) as conn:
        rows = conn.execute("SELECT id, name, specialty, lead_days FROM vendors ORDER BY id").fetchall()
    return {"vendors": [dict(r) for r in rows]}


@mcp.tool
def get_invoice(invoice_id: int) -> dict:
    """One vendor bill with its vendor and how late it is (invoices + vendors tables).

    Ticket 101 links to invoice 501, the rush reprint of the size-S tee.
    days_overdue is counted from desk.date_today; 0 or less means it isn't late yet.
    """
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT i.id, i.vendor_id, v.name AS vendor_name, v.specialty AS vendor_specialty, "
            "v.lead_days AS vendor_lead_days, i.amount, i.due_date, i.status, i.description "
            "FROM invoices i JOIN vendors v ON v.id = i.vendor_id WHERE i.id = ?",
            (invoice_id,),
        ).fetchone()
        if row is None:
            return {"error": f"Invoice {invoice_id} not found."}
        today = _shop_today(conn)
    result = {**dict(row), "shop_today": today}
    if today:
        result["days_overdue"] = _days_between(row["due_date"], today)
    return result


# ---------------------------------------------------------------- leases


@mcp.tool
def get_lease(lease_id: int) -> dict:
    """The shop's own record of a lease: rent, landlord, and next due date (leases table).

    Use it to check a rent notice against the lease, e.g. ticket 102 (lease 1), before
    anyone pays. days_until_due is counted from the shop's date in desk.date_today.
    """
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT id, space_name, landlord, monthly_rent, next_due, notes FROM leases WHERE id = ?",
            (lease_id,),
        ).fetchone()
        if row is None:
            return {"error": f"Lease {lease_id} not found."}
        today = _shop_today(conn)
    result = {**dict(row), "shop_today": today}
    if today:
        result["days_until_due"] = _days_between(today, row["next_due"])
    return result


# ---------------------------------------------------------------- cash and payments


@mcp.tool
def get_cash_balance(account: str = "checking") -> dict:
    """Balance of one cash account and the date it was taken (cash_accounts table)."""
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT name, balance, date FROM cash_accounts WHERE name = ?", (account.strip().lower(),)
        ).fetchone()
        if row is None:
            names = [r["name"] for r in conn.execute("SELECT name FROM cash_accounts")]
            return {"error": f"No cash account named {account}.", "accounts_on_file": names}
    return dict(row)


@mcp.tool
def list_payments(kind: str | None = None, ref_id: int | None = None) -> dict:
    """Money already paid out, optionally filtered by kind and ref_id (payments table).

    Check it before recommending a payment so nothing is paid twice.
    """
    sql, args = "SELECT * FROM payments WHERE 1=1", []
    if kind:
        sql, args = sql + " AND kind = ?", [*args, kind.strip()]
    if ref_id is not None:
        sql, args = sql + " AND ref_id = ?", [*args, ref_id]
    with closing(_connect()) as conn:
        rows = conn.execute(sql + " ORDER BY id", args).fetchall()
    return {"count": len(rows), "total": round(sum(r["amount"] for r in rows), 2), "payments": [dict(r) for r in rows]}


# ---------------------------------------------------------------- human-only tools (backend routes)


def _add_month(day: str) -> str:
    d = date.fromisoformat(day)
    y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    for dd in (d.day, 30, 29, 28):
        try:
            return date(y, m, dd).isoformat()
        except ValueError:
            continue
    raise ValueError(day)


@mcp.tool
def list_tickets() -> dict:
    """HUMAN DASHBOARD. Every ticket with its status and whether it is resolved (tickets table)."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT id, type, requester, subject, sku, size, qty, lease_id, invoice_id, status, notes, created_at "
            "FROM tickets ORDER BY id"
        ).fetchall()
    return {"tickets": [{**dict(r), "resolved": r["status"] in DONE_STATUSES} for r in rows]}


@mcp.tool
def approve_payment(
    kind: str,
    ref_id: int,
    approved_by: str,
    amount: float | None = None,
    ticket_id: int | None = None,
    resolve_ticket: bool = True,
    account: str = "checking",
) -> dict:
    """HUMAN ONLY. Pay money out after a person approved it (writes payments and cash_accounts,
    plus invoices / leases / tickets).

    kind: "invoice" (ref_id = invoice id; pays the invoice amount and marks it paid),
          "rent" (ref_id = lease id; pays monthly_rent and moves next_due on one month),
          "purchase" (ref_id = vendor id; amount required).
    approved_by: the person's name. Agent names are refused.
    Refuses if the amount doesn't match the record, the bill is already paid, or cash is short.
    """
    kind, approver, account = kind.strip().lower(), " ".join(approved_by.split()), account.strip().lower()
    if kind not in PAYMENT_KINDS:
        return {"error": f"kind must be one of {list(PAYMENT_KINDS)}."}
    if not approver or approver.lower() in {a.lower() for a in AGENT_NAMES}:
        return {"error": "approved_by must be a person's name, not empty and not an agent."}
    with closing(_connect(write=True)) as conn:
        today = _shop_today(conn)
        cash = conn.execute("SELECT balance FROM cash_accounts WHERE name = ?", (account,)).fetchone()
        if cash is None:
            return {"error": f"No cash account named {account}."}
        if kind == "invoice":
            inv = conn.execute("SELECT * FROM invoices WHERE id = ?", (ref_id,)).fetchone()
            if inv is None:
                return {"error": f"Invoice {ref_id} not found."}
            if inv["status"] != "open":
                return {"error": f"Invoice {ref_id} is {inv['status']}, not open; nothing to pay."}
            due, what = inv["amount"], f"invoice {ref_id} ({inv['description']})"
        elif kind == "rent":
            lease = conn.execute("SELECT * FROM leases WHERE id = ?", (ref_id,)).fetchone()
            if lease is None:
                return {"error": f"Lease {ref_id} not found."}
            due, what = lease["monthly_rent"], f"rent on lease {ref_id} due {lease['next_due']}"
        else:
            vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (ref_id,)).fetchone()
            if vendor is None:
                return {"error": f"Vendor {ref_id} not found."}
            if amount is None or amount <= 0:
                return {"error": "A purchase needs a positive amount."}
            due, what = amount, f"purchase from {vendor['name']}"
        due = round(float(due), 2)
        if amount is not None and round(float(amount), 2) != due:
            return {"error": f"Amount {amount:.2f} doesn't match the record ({due:.2f}); nothing paid."}
        if due > cash["balance"]:
            return {"error": f"Not enough cash: {account} has {cash['balance']:.2f}, payment is {due:.2f}."}
        ticket = None
        if ticket_id is not None:
            ticket = conn.execute("SELECT notes FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
            if ticket is None:
                return {"error": f"Ticket {ticket_id} not found."}

        new_balance = round(cash["balance"] - due, 2)
        with conn:
            cur = conn.execute(
                "INSERT INTO payments (kind, ref_id, amount, account, paid_at, approved_by) VALUES (?, ?, ?, ?, ?, ?)",
                (kind, ref_id, due, account, today, approver),
            )
            conn.execute("UPDATE cash_accounts SET balance = ?, date = ? WHERE name = ?", (new_balance, today, account))
            if kind == "invoice":
                conn.execute("UPDATE invoices SET status = 'paid' WHERE id = ?", (ref_id,))
            elif kind == "rent":
                conn.execute("UPDATE leases SET next_due = ? WHERE id = ?", (_add_month(lease["next_due"]), ref_id))
            if ticket is not None:
                line = f"[{today} Human: {approver}] Approved and paid ${due:,.2f} for {what}."
                notes = f"{ticket['notes']}\n{line}" if ticket["notes"] else line
                status_sql = ", status = 'resolved'" if resolve_ticket else ""
                conn.execute(f"UPDATE tickets SET notes = ?{status_sql} WHERE id = ?", (notes, ticket_id))
    return {
        "payment_id": cur.lastrowid, "kind": kind, "ref_id": ref_id, "amount": due, "account": account,
        "paid_at": today, "approved_by": approver, "balance_before": cash["balance"], "balance_after": new_balance,
        "ticket_id": ticket_id, "ticket_resolved": ticket is not None and resolve_ticket,
    }


@mcp.tool
def resolve_ticket(ticket_id: int, resolved_by: str, note: str) -> dict:
    """HUMAN ONLY. Mark a ticket resolved once a person has signed off every approval (writes tickets).

    resolved_by must be a person (agent names refused), or "System" when a run needed no approvals.
    """
    who, note = " ".join(resolved_by.split()), " ".join(note.split())[:MAX_NOTE_CHARS]
    if not who or who.lower() in {a.lower() for a in AGENT_NAMES}:
        return {"error": "resolved_by must be a person's name (or System), not an agent."}
    with closing(_connect(write=True)) as conn:
        row = conn.execute("SELECT status, notes FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return {"error": f"Ticket {ticket_id} not found."}
        if row["status"] in DONE_STATUSES:
            return {"ticket_id": ticket_id, "status": row["status"], "already": True}
        line = f"[{_shop_today(conn)} {'Human: ' + who if who != 'System' else 'System'}] Resolved. {note}".strip()
        with conn:
            conn.execute(
                "UPDATE tickets SET status = 'resolved', notes = ? WHERE id = ?",
                (f"{row['notes']}\n{line}" if row["notes"] else line, ticket_id),
            )
    return {"ticket_id": ticket_id, "old_status": row["status"], "status": "resolved", "note": line}


@mcp.tool
def reset_database() -> dict:
    """HUMAN ONLY. Copy the original data/campus_customs.db over the working copy for a fresh run."""
    if not ORIGINAL_DB_PATH.exists():
        return {"error": f"Original database not found: {ORIGINAL_DB_PATH}"}
    for extra in ("-journal", "-wal", "-shm"):
        Path(str(DB_PATH) + extra).unlink(missing_ok=True)
    shutil.copyfile(ORIGINAL_DB_PATH, DB_PATH)
    with closing(_connect()) as conn:
        statuses = {r["id"]: r["status"] for r in conn.execute("SELECT id, status FROM tickets")}
        cash = conn.execute("SELECT balance FROM cash_accounts WHERE name = 'checking'").fetchone()
    return {"reset": True, "from": ORIGINAL_DB_PATH.name, "to": DB_PATH.name, "ticket_status": statuses,
            "checking_balance": cash["balance"] if cash else None}


if __name__ == "__main__":
    mcp.run()
