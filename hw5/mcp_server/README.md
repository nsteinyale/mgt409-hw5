# Campus Customs MCP server

**What it's for:** this is the one place every Homework 5 agent goes for shop facts. The agent team (`backend/`) has no database code of its own. Agents call these tools, so they only ever see real values from the database. If a row doesn't exist, a tool returns an `error` field instead of guessing.

**Database:** `../data/campus_customs_new.db`, the working copy. The original `data/campus_customs.db` is never changed; it is only copied for a reset. Read tools open the database read-only. The two agent write tools can only change a ticket's notes and status.

**Built with:** FastMCP (`pip install -r requirements.txt`). It runs over stdio with `python server.py`. Claude Code connects through `.mcp.json`, and the agent team starts it from `backend/team.py`.

## Agent tools (13)

| Tool | Reads / writes | Table(s) | Returns | Main ticket |
|---|---|---|---|---|
| `get_shop_date()` | read | desk | The shop's "today" and desk notes | all |
| `list_open_tickets()` | read | tickets | Every ticket that isn't closed | all |
| `get_ticket(ticket_id)` | read | tickets | One ticket in full | all |
| `add_ticket_note(ticket_id, author, note)` | **write** | tickets.notes | Appends a dated, signed note (600 characters max; author must be one of the five agents) | all |
| `set_ticket_status(ticket_id, status)` | **write** | tickets.status | Sets open / in_progress / waiting_on_human. It can't close a ticket. | all |
| `check_stock(sku, size)` | read | inventory | Shelf count, location, and whether it's in stock | 101, 103 |
| `list_stock_by_size(sku)` | read | inventory | Every size of a SKU, with the total | 103 |
| `get_pricing(sku, qty)` | read | pricing | List price, unit cost, margin per unit, and totals for `qty` | 103 |
| `list_vendors()` | read | vendors | Suppliers, their specialty, and lead days | 101 |
| `get_invoice(invoice_id)` | read | invoices + vendors | Amount, due date, status, vendor, and days overdue | 101 |
| `get_lease(lease_id)` | read | leases (+ desk) | Landlord, rent, next due date, and days until due | 102 |
| `get_cash_balance(account)` | read | cash_accounts | Balance and the date it was taken | 101, 102 |
| `list_payments(kind, ref_id)` | read | payments | Past payments, so nothing is paid twice | 101, 102 |

No agent tool can pay, change prices or stock, or resolve a ticket. Those need a human.

## Human-only tools (3), called by the dashboard backend (`backend/main.py`)

These tools are on the same server, so every database change still goes through MCP. They are not in any agent's tool list (`ROLE_TOOLS` in `backend/team.py`), so the agents can't see or call them.

| Tool | Reads / writes | Table(s) | What it does |
|---|---|---|---|
| `list_tickets()` | read | tickets | All tickets, including resolved ones, each with a `resolved` flag |
| `approve_payment(kind, ref_id, approved_by, amount, ticket_id, resolve_ticket)` | **write** | payments, cash_accounts, invoices / leases, tickets | Pays an approved `invoice`, `rent` or `purchase`. It refuses agent names as the approver, an amount that doesn't match the record, an invoice that's already paid, and a payment bigger than the cash. It adds the payment row, lowers the cash balance, marks the invoice paid (or moves the lease's next due date on a month), and resolves the ticket with a signed note. |
| `reset_database()` | **write** | whole file | Copies the original `data/campus_customs.db` over the working copy for a fresh run |
