# Campus Customs Operations Harness

This file is the complete map of the Campus Customs multi-agent system: the data, the MCP tools, the five agents, the API routes, the dashboard, the safety rules, and the results of the final run.

**Contents:**
1. Tables
2. The three open tickets
3. MCP tools (the first three, then all 17 with their tables)
4. Agent team
5. Audit trail
6. Safety
7. Ticket plan
8. Backend routes
9. Dashboard
10. Final run results (Problem 9)
11. How to run it

**Databases:** `data/campus_customs.db` is the original and is never edited. `data/campus_customs_new.db` is the working copy, and the agents write to that one.

**System at a glance:** React board (`frontend/`, :5173) → FastAPI routes (`backend/main.py`, :8000) → agent team (`backend/team.py`, PydanticAI, `gpt-6-luna` via Portkey) → **MCP server** (`mcp_server/server.py`, FastMCP over stdio) → `data/campus_customs_new.db`. Every shop fact and every change goes through the MCP server, and every agent step is appended to `output/audit_trail.json`.

## Tables

### desk
Fields: `date_today`, `notes`

Why it matters: it holds the shop's "today" (2026-08-31). Agents should measure due dates and lateness from this date, not the real clock.

### inventory
Fields: `sku`, `name`, `size`, `qty`, `location` (key: `sku` + `size`)

Why it matters: it shows what's on the shelf for each size and where it is. Agents check it before promising an order.

### pricing
Fields: `sku`, `unit_cost`, `list_price`

Why it matters: it has the normal price and the shop's cost. Agents use it to quote orders and to see how much margin a discount would give up.

### vendors
Fields: `id`, `name`, `specialty`, `lead_days`

Why it matters: these are the suppliers for restocks. `lead_days` tells an agent how long a restock will take.

### leases
Fields: `id`, `space_name`, `landlord`, `monthly_rent`, `next_due`, `notes`

Why it matters: it is the shop's record of what rent is owed and when. Agents check a rent notice against this table before acting on it.

### cash_accounts
Fields: `name`, `balance`, `date`

Why it matters: it shows how much cash the shop has. Agents must not plan payments that add up to more than this balance.

### payments
Fields: `id`, `kind`, `ref_id`, `amount`, `account`, `paid_at`, `approved_by`

Why it matters: it is the log of money paid out, and it starts empty. `approved_by` is required, so every payment has to name who approved it.

### invoices
Fields: `id`, `vendor_id` → vendors, `amount`, `due_date`, `status`, `description`

Why it matters: these are bills the shop owes vendors. Agents use them to see what is unpaid, overdue, and tied to a ticket.

### tickets
Fields: `id`, `type`, `requester`, `subject`, `sku`, `size`, `qty`, `lease_id` → leases, `invoice_id` → invoices, `status`, `notes`, `created_at`

Why it matters: this is the work queue. Each ticket links to the inventory, invoice, or lease it concerns, and agents use those links to look up the facts.

## The three open tickets and how they link

| Ticket | Type | Links to | What the linked data shows |
|---|---|---|---|
| 101 | customer_order: Tauhid Zaman, 1 × CC-TEE-WHITE size S | inventory, pricing, invoice 501 → vendor 1 | Size S has **0 in stock**. Invoice 501 ($840, "Rush reprint CC-TEE-WHITE S", Bulldog Print Co, 5 lead days) is still **open**, and it was due 2026-08-28, so it is past due. The order can't ship until the reprint arrives. |
| 102 | rent_notice: Elm City Properties | lease 1 | The lease confirms $2,400 rent on the Chapel Street shop, due 2026-09-02. That is 2 days out, which matches the notice, but it came by email, so it should be checked against the lease record. |
| 103 | price_override: Yale AI Club, 20 × CC-HOOD-NAVY size M | inventory, pricing | Size M has **only 8 in stock**, so they are 12 short. The list price is $58 and the cost is $22, so any discount has to be approved and should stay above cost. |

**Cash check across the tickets:** checking has $3,400. Paying invoice 501 ($840) and the rent ($2,400) comes to $3,240, which leaves only $160. Any payment needs an `approved_by` entry in `payments`.

## MCP tools (`mcp_server/server.py`)

Every agent gets its facts through these tools, which read `data/campus_customs_new.db`. These three only read the database and only return stored values (plus simple math on them). Problem 5 added more tools, listed in the full table below. If a row is missing, they return an `error` instead of making something up.

### `check_stock(sku, size)`
- **Reads:** `inventory`
- **Unlocks:** ticket **101** (Tauhid Zaman, 1 × CC-TEE-WHITE size S)
- **Why it's the right tool:** ticket 101 is a promise to ship one size-S tee, and only the shelf count for that exact SKU and size can say whether we can keep it. It returns qty 0, which tells the agent not to promise shipping and to look at the open reprint invoice 501 instead. It also answers ticket 103's question of whether we can fill 20 size-M hoodies: only 8 are on the shelf.

### `get_lease(lease_id)`
- **Reads:** `leases` (plus `desk.date_today` for the shop's date)
- **Unlocks:** ticket **102** (an email from Elm City Properties saying rent is due in 2 days, linked to lease 1)
- **Why it's the right tool:** a rent email is a request to send money, so the agent has to check it against the shop's own lease record before paying. Lease 1 confirms the landlord, $2,400 rent, and a 2026-09-02 due date, 2 days from the shop's date, so the email matches.

### `get_pricing(sku, qty)`
- **Reads:** `pricing`
- **Unlocks:** ticket **103** (Yale AI Club asks for a bulk discount on 20 × CC-HOOD-NAVY)
- **Why it's the right tool:** a discount request can't be answered without knowing how far the price can drop before the shop loses money. For 20 hoodies it returns $58 list against $22 cost: $1,160 at list, $440 at cost, and $36 of room per hoodie.

## Agent team (Problem 5, `backend/`)

Built with PydanticAI. All five agents use **`gpt-6-luna`** through Portkey (`PORTKEY_API_KEY`), and no other model. Each agent has its own prompt file, and the two typed outputs live in `backend/models.py`. Each one runs its own loop (`agent.iter()` in `backend/team.py`), and every step of that loop is written to `output/audit_trail.json`. To run the team: `backend/.venv/Scripts/python.exe backend/run_team.py`.

| Agent | Prompt | Job | Output | MCP tools it may call |
|---|---|---|---|---|
| **Boss** | `prompts/boss.md` | Owns the ticket queue. Splits tickets, delegates, checks the reports, sets ticket status, and reports to the owner. | `TeamReport` | get_shop_date, list_open_tickets, get_ticket, set_ticket_status, add_ticket_note |
| **Inventory** | `prompts/inventory.md` | Shelf counts and restocks, and whether an unpaid reprint blocks an order (ticket 101, stock side of 103). | `AgentReport` | get_shop_date, get_ticket, check_stock, list_stock_by_size, list_vendors, get_invoice, add_ticket_note |
| **Accounting** | `prompts/accounting.md` | Invoices, overdue bills, cash, past payments, and margin on discounts (101's invoice, 102's rent, 103's discount). Prepares payments, never sends them. | `AgentReport` | get_shop_date, get_ticket, get_invoice, list_vendors, get_cash_balance, list_payments, get_pricing, get_lease, add_ticket_note |
| **Facilities** | `prompts/facilities.md` | Lease and landlord. Checks the emailed rent notice against the lease (ticket 102). | `AgentReport` | get_shop_date, get_ticket, get_lease, list_vendors, add_ticket_note |
| **CustomerService** | `prompts/customer_service.md` | Customer side. Drafts honest replies for 101 and 103, with no ship-date or discount promises. | `AgentReport` | get_shop_date, get_ticket, check_stock, list_stock_by_size, get_pricing, add_ticket_note |

**Delegation (full connectivity):** every agent has the same `ask_agent(agent, task)` tool and can hand work to any of the other four, specialists included. A request is refused, and the refusal logged, if the target is the agent itself, the target is already in the current chain (this stops A→B→A loops), the chain is already 2 levels deep, or the team has used its 10 delegations. All agents in a run share one usage counter, so the token cap covers the whole team.

**Shop facts only through MCP:** the agents have no database code. All 13 shop tools come from the `campus-customs-ops` MCP server (`mcp_server/server.py`), which `backend/team.py` starts once per run over stdio. Each agent's MCP access is filtered to the tools its role needs.

## All MCP tools and the tables they use

| Tool | Table(s) | Reads / writes | Used for |
|---|---|---|---|
| `get_shop_date` | desk | read | The shop's "today" (2026-08-31) for every due date and overdue check |
| `list_open_tickets` | tickets | read | The work queue (101, 102, 103) |
| `get_ticket` | tickets | read | One ticket's exact request, notes and links |
| `add_ticket_note` | tickets | **write** (notes column only, append) | Leaves a dated note signed by the agent |
| `set_ticket_status` | tickets | **write** (status column only) | open / in_progress / waiting_on_human. It can't close a ticket. |
| `check_stock` | inventory | read | Size S tee for 101; size M hoodies for 103 |
| `list_stock_by_size` | inventory | read | Other hoodie sizes for 103's 20-hoodie request |
| `get_pricing` | pricing | read | List, cost and margin for 103's discount |
| `list_vendors` | vendors | read | Who reprints the tee and their lead time (101) |
| `get_invoice` | invoices + vendors | read | Invoice 501 for 101: $840, due 8/28, still open, days overdue |
| `get_lease` | leases (+ desk) | read | Checks 102's rent email against lease 1 |
| `get_cash_balance` | cash_accounts | read | $3,400 checking, to see what can be paid |
| `list_payments` | payments | read | Confirms nothing was already paid, so nothing is paid twice |
| `list_tickets` *(human only, Problem 7)* | tickets | read | Dashboard list of every ticket, including resolved ones |
| `approve_payment` *(human only, Problem 7)* | payments, cash_accounts, invoices / leases, tickets | **write** | Pays an approved bill and lowers cash. Only `POST /api/approve` calls it; no agent can see it. |
| `reset_database` *(human only, Problem 7)* | whole working file | **write** | Copies the original database over the working copy for a fresh run |
| `resolve_ticket` *(human only, Problem 8)* | tickets | **write** | Marks a ticket resolved with a signed note once a person has decided every approval. Agent names are refused. |

That makes **17 tools**: 13 the agents can use (11 read, 2 write limited to notes and status) and 4 human-only tools that only the backend routes call.

## Audit trail (`output/audit_trail.json`)

The file is a JSON array that only grows: each run reads the file, adds its entries, and writes it back, so earlier runs are never wiped. Each entry records:
- `run_id`, `seq`, and `logged_at`
- which `agent`, its `depth`, and the delegation `chain` (e.g. `Boss → Inventory`)
- the loop `step` and the `event`: run_start, user_prompt, model_request (tool results going back to the model), model_response (tool calls with their arguments, plus any text), delegation_start / delegation_end / delegation_refused, run_end (the typed output), or error
- the `model` and running `usage` (requests, input and output tokens, tool calls)

Long text is cut at 1,500 characters so the file stays readable.

## Safety

**Guardrails for real customers and real money:**
- **No agent can move money.** There is no payment tool. Accounting only recommends, and every payment, discount, or promise to a customer goes into `needs_human` for a person to approve. `payments.approved_by` must be a human, never an agent.
- **Nothing ships while its invoice is unpaid.** Ticket 101's tee waits on invoice 501. Agents give the customer an honest status, not a date.
- **Dates come from `desk.date_today`**, never the real clock, so "overdue" and "due in 2 days" are consistent and testable.
- **Check before paying.** An emailed rent notice is checked against the lease record. A new bank account, a changed amount, or pressure to pay fast is treated as possible fraud and sent to a human.
- **No discounts below list without approval, and never below cost.** Agents report the margin; a person decides.
- **Least privilege.** Each agent only sees the MCP tools its role needs. The write tools only touch ticket notes and status, only accept the five agent names as authors, and can't close a ticket.
- **Facts only from tools.** The prompts forbid inventing numbers. Tools return an `error` instead of guessing, and the original `data/campus_customs.db` is never touched.
- **Everything is auditable.** Every step, tool call, and delegation goes into an append-only trail.
- **Customer drafts keep back-office details out**, and a human sends them. A code check (`no_internal_details_to_customers` in `backend/team.py`) rejects any draft that mentions invoices, vendors, payments, rent, costs, margins or cash, and sends it back to the agent to rewrite. The customer hears "out of stock, restocking, we'll confirm", not "our vendor invoice is unpaid".
- **Each fact is noted once.** Only the Boss and teammates the Boss asked directly can write ticket notes. When one specialist asks another, the note tool is hidden from the helper, which reports back instead. This stops the same finding from being written twice.
- **A human closes the loop.** Agents can move a ticket only to `waiting_on_human`. A ticket becomes `resolved` only after a person has approved or declined every item the run raised on the board. Payments need a typed name and a second "Yes, pay it" click.
- **The money tool checks itself.** `approve_payment` refuses agent names, amounts that don't match the invoice or lease, bills that are already paid, and payments larger than the cash balance. Each payment writes a `payments` row with `approved_by`, lowers `cash_accounts`, and marks the bill paid.
- **Resets keep history.** `POST /api/reset` restores the shop data, but the audit trail is never wiped, and a reset is refused while a run is going.

**Limits that keep token use in check** (`backend/config.py`):
- At most 1,500 output tokens per model response.
- One budget for the whole team per run: 45 model requests, 80 tool calls, and 250,000 total tokens. PydanticAI stops the run when any of these is reached.
- At most 10 delegations per run, a chain at most 2 levels deep, and no re-asking an agent already in the chain.
- Delegated tasks are capped at 800 characters, and ticket notes at 600.
- Prompts tell agents to call each tool once per question, to avoid repeating calls, and to stop when they have the facts.

## Ticket plan (Problem 6, `output/desk_tickets.html`)

Open the page by double-clicking it; it has one tab per ticket, plus Cash and Reflection tabs (coming later). Each ticket tab has an **Expected** plan (who the Boss calls first and why, each agent's obligations in order, and the MCP tools we expect) and an empty **Actual** section to compare against after the agents run.

| Ticket | Boss calls first | Then | Not involved |
|---|---|---|---|
| 101 tee order | Inventory: can we fill it, and does unpaid invoice 501 block it? | Accounting (overdue $840, cash) → CustomerService (honest delay reply) | Facilities |
| 102 rent email | Facilities: check the email against lease 1 before any money talk | Accounting (not yet paid, $3,400 cash, $160 left if both bills are paid) | Inventory, CustomerService |
| 103 bulk hoodies | Inventory: only 8 of 20 size M, which shapes the offer | Accounting ($36/unit room, cost is the floor) → CustomerService (no discount promised) | Facilities |

## Backend routes (Problem 7, `backend/main.py`)

FastAPI, started from `backend/` with `uvicorn main:app --reload --port 8000` (use `.venv\Scripts\uvicorn` if the venv isn't activated), so it runs at http://localhost:8000. Interactive docs are at `/docs`. The routes have no SQL of their own: every shop fact and every change goes through the MCP server. Agents only prepare payments, and `POST /api/approve` is the only thing that changes cash.

- `GET /api/health`: server is up, the model in use, whether MCP is connected, and any run in progress.
- `GET /api/tickets`: all three tickets with their status and `state` (open or resolved), from MCP `list_tickets`.
- `POST /api/tickets/{id}/run`: starts the agent team on that one ticket and returns a `run_id` right away (202). Only one run at a time; a resolved ticket is refused.
- `GET /api/runs/{run_id}`: whether that run is running, done or errored, plus the Boss's TeamReport (decisions and approvals needed) once it's done.
- `GET /api/events?limit=&run_id=&ticket_id=&since_seq=`: recent agent events from `output/audit_trail.json`, newest first: agent, what it said, and which tools it called, so the board can refresh.
- `POST /api/approve`: a person clicks Approve. Body `{kind: invoice|rent|purchase, ref_id, approved_by, amount?, ticket_id?, resolve_ticket?}`. It calls MCP `approve_payment`, which writes the payment, lowers cash, marks the bill paid and resolves the ticket. The approval is logged in the audit trail as `Human: <name>`.
- `GET /api/cash`: the current checking balance from `cash_accounts`.
- `POST /api/reset`: puts the working database back to the original values (MCP `reset_database`) for a fresh run. The audit trail is kept, and reset is refused while a run is going.

**Money safety on these routes:** approvals refuse agent names as the approver, amounts that don't match the invoice or lease, bills that are already paid, and payments larger than the cash balance.

**Routes added for the dashboard (Problem 8):**
- `GET /api/runs`: every run since the last reset, newest first, so the board recovers after a page refresh. Runs are saved in `output/runs.json`.
- `GET /api/runs/{run_id}/agents`: what each agent actually did in a run: tools used with counts, who it summoned or was summoned by, notes written, and its summary.
- `POST /api/runs/{run_id}/approvals/{index}`: a person approves or declines one item the agents raised, body `{decision, approved_by}`. Approving a payment or purchase pays it through MCP `approve_payment`. When every item is approved, the ticket is resolved through MCP `resolve_ticket` (human only). A run with no approvals resolves its ticket when it finishes.

## Dashboard (Problem 8, `frontend/`)

React + Vite + TypeScript. Start it from `frontend/` with `npm run dev`, which opens http://localhost:5173. It calls the backend at http://localhost:8000, and the backend's CORS allows any localhost origin, including 5173. The design choices are in `output/design.md`. It meets each requirement this way:
1. **Lists all three tickets** on the Quest Board, each with its state.
2. **Pick a ticket and start the team** with "Draw the sword: send the party" (`POST /api/tickets/{id}/run`).
3. **Shows each agent and what it says and does while running**: the live Chronicle polls `/api/events` every 1.5 s, and the acting agent glows in the Party panel.
4. **Marks the ticket resolved when the run is done** and its approvals are signed: the card turns gold with *Light restored*.
5. **Short summary of what each agent actually did**: the Party panel after the run, from `/api/runs/{id}/agents`. Agents that weren't used show "stayed at camp".
6. **A human approves a payment or purchase when asked**: Seals for your hand, with name, Approve, and a confirm step for money.
7. **Checking balance**: the rupee wallet in the top bar, which counts down with a −$ marker after an approved payment.

`MCP resolve_ticket` (human only, tickets table) was added for step 4 and isn't in any agent's tool list.

## Final run results (Problem 9)

The working database was reset to the original values (`POST /api/reset`), and the starting checking balance was confirmed as **$3,400.00** with 0 payments. Then tickets **101 → 102 → 103** were each run on the React board and approved there until resolved. Approvals were signed as "Shop Owner".

| Ticket | Boss called first | Agents that worked | Human approvals | Cash change | Final status |
|---|---|---|---|---|---|
| 101 tee order | Inventory (as planned) | Boss, Inventory, Accounting, CustomerService | Pay invoice 501 **$840**: approved; customer message: approved | **−$840.00** | resolved |
| 102 rent notice | Facilities (as planned) | Boss, Facilities, Accounting | Pay rent on lease 1 **$2,400**: approved | **−$2,400.00** | resolved |
| 103 bulk hoodies | Inventory (as planned) | Boss, Inventory, CustomerService, Accounting | Bulk discount: **declined** (no price proposed, so it stays at the $58 list price); 12-unit shortfall check: approved | $0.00 | resolved |

**Cash:** $3,400.00 − $840.00 − $2,400.00 = **$160.00**, which matches `cash_accounts.checking` in `data/campus_customs_new.db`, checked through the MCP `get_cash_balance` tool. The `payments` table has 2 rows totalling $3,240, both `approved_by` Shop Owner, and invoice 501 is now `paid`.

**Outputs from this run:**
- `output/desk_tickets.html`: the Actual section on each ticket tab (agents, delegations, tools, approvals, and plan-vs-actual) and the itemized **Cash** tab.
- `output/resolved_tickets.json`: per ticket, the ID, final status, outcome, each agent's contribution, delegations, guardrail stops, human approvals and cash change, plus the start and end balances.
- `output/resolved_board.html`, with screenshots in `output/screenshots/`: the React board for each resolved ticket.
- `output/audit_trail.json`: 198 more entries appended for these three runs and approvals, now 687 total; earlier runs are kept.

## How to run it

```
# backend (from backend/)
.venv\Scripts\uvicorn main:app --reload --port 8000
# dashboard (from frontend/)
npm run dev          # opens http://localhost:5173 (add ?nointro to skip the intro)
# one team run from the command line (from backend/)
.venv\Scripts\python.exe run_team.py "Work ticket 101 only."
```
