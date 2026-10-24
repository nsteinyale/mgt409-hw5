# MGT 409 Homework 5: Campus Customs Multi-Agent Operations

A five-agent team (Boss, Inventory, Accounting, Facilities, Customer Service) works the shop's open tickets. The agents get every shop fact from an **MCP server** over a SQLite database. A **FastAPI** backend runs the team, and a **React** board lets a human watch the agents and approve any payment. Only a human's Approve click moves money.

```
React board (frontend/, :5173) → FastAPI (backend/main.py, :8000) → agent team (backend/team.py, PydanticAI, gpt-6-luna via Portkey)
                                                                   → MCP server (mcp_server/server.py, FastMCP over stdio) → data/campus_customs_new.db
```

Start with **[`output/harness.md`](output/harness.md)**: it maps the tables, the 17 MCP tools, the five agents, the API routes, the dashboard and the safety rules, plus the results of the final run.

## What's in here

| Path | What it is |
|---|---|
| `data/campus_customs.db` | The **original** data. Never edited; only copied for a reset. |
| `data/campus_customs_new.db` | The **working copy**. The MCP server reads and writes this one. |
| `mcp_server/server.py` | FastMCP server: 13 agent tools and 4 human-only tools ([README](mcp_server/README.md)) |
| `backend/` | `main.py` (FastAPI routes), `team.py` (the agents and delegation), `models.py` (data types), `config.py` (model and limits), `audit.py`, `prompts/` (one prompt per agent), `run_team.py` (command-line run) |
| `frontend/` | React + Vite + TypeScript "Twilight Desk" board, with a Pinball replay view and the intro |
| `output/` | `harness.md`, `mcp_smoke.json`, `desk_tickets.html`, `design.md`, `resolved_tickets.json`, `resolved_board.html` (+ `screenshots/`), `audit_trail.json`, `github_url.txt` |
| `AI_prompts.md` | The prompt log, one section per problem |
| `.mcp.json` | Connects Claude Code (or any MCP client) to the server |

## Setup (once)

You need Python 3.11+ and Node 18+.

```bash
# from this folder (hw5/)
python -m venv .venv
.venv\Scripts\activate                 # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

copy .env.example .env                 # macOS/Linux: cp .env.example .env
# then put your key in .env:  PORTKEY_API_KEY=...

cd frontend
npm install
cd ..
```

Every agent uses **`gpt-6-luna`** through Portkey (set in `backend/config.py`). The real `.env` is git-ignored and is never committed.

## Running it

### 1. (For a clean run) copy the original database to the working copy

The working copy keeps whatever the last run did: ticket statuses, notes, payments, cash. To start fresh, copy the original over it while the backend is stopped:

```bash
copy data\campus_customs.db data\campus_customs_new.db     # macOS/Linux: cp data/campus_customs.db data/campus_customs_new.db
```

If the backend is already running, use the board's **Banish the Twilight (reset)** button or `POST http://localhost:8000/api/reset` instead. These do the same copy through the MCP `reset_database` tool and keep the audit trail.

### 2. The MCP server

The backend **starts the MCP server for you** over stdio, so you don't need a separate terminal. To run it on its own (for example, to try the tools):

```bash
python mcp_server/server.py
```

Claude Code picks it up from `.mcp.json` (`campus-customs-ops`) when you open a session in this folder.

### 3. Start the FastAPI backend (http://localhost:8000)

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Interactive docs are at http://localhost:8000/docs. The routes are: `GET /api/tickets`, `POST /api/tickets/{id}/run`, `GET /api/runs`, `GET /api/runs/{id}`, `GET /api/runs/{id}/agents`, `POST /api/runs/{id}/approvals/{i}`, `GET /api/events`, `POST /api/approve`, `GET /api/cash`, `POST /api/reset` and `GET /api/health`.

### 4. Start the React board (http://localhost:5173)

```bash
cd frontend
npm run dev
```

It opens with a short intro: press any key, or click **Skip intro**. Then choose **Tickets Dashboard** or **Pinball-Style Agentic Dashboard Replays**. Add `?nointro` to the URL to go straight to the board.

### 5. A full three-ticket run

1. **Reset first:** click **Banish the Twilight (reset)**. All three tickets go back to open, and checking returns to **$3,400.00**.
2. For **101**, **102** and **103** in turn: pick the ticket and click **Draw the sword: send the party**, then watch the Chronicle (or the ⚔ Admin · Pinball view).
3. When the run finishes, type your name under **Signing as** and approve or decline each item. Payments ask for a second "Yes, pay it" click. A ticket turns **resolved** once every item is decided.
4. The rupee wallet shows checking after each payment. In our run: $3,400 − $840 (invoice 501) − $2,400 (rent) = **$160**. See the Cash tab in `output/desk_tickets.html`.

Every agent step and every human approval is appended to `output/audit_trail.json`. The file is never wiped.

### Command-line run (no board)

```bash
cd backend
python run_team.py "Work ticket 102 only."
```

## Safety, in one paragraph

- **Money and status:** agents can't move money or resolve tickets. Their only write tools add notes and set `open` / `in_progress` / `waiting_on_human`. Payments go through the human-only `approve_payment` tool, which refuses agent names, wrong amounts, double payments and overdrafts.
- **What each agent can do:** each agent sees only the tools its role needs. Customer drafts are checked so internal details (invoices, vendors, costs, cash) never reach a customer.
- **Limits:** delegation loops are blocked, and every run has hard caps on requests, tool calls and tokens.

The details are in `output/harness.md` → Safety.
