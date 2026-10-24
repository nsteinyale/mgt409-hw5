// Shapes returned by the FastAPI backend (backend/main.py).

export type AgentName = 'Boss' | 'Inventory' | 'Accounting' | 'Facilities' | 'CustomerService'

export interface Ticket {
  id: number
  type: string
  requester: string
  subject: string
  sku: string | null
  size: string | null
  qty: number | null
  lease_id: number | null
  invoice_id: number | null
  status: string
  notes: string | null
  created_at: string
  resolved: boolean
  state: 'open' | 'resolved'
  last_run: string | null
}

export interface Approval {
  index: number
  kind: 'payment' | 'purchase' | 'discount' | 'customer_message' | 'verify' | 'other'
  ticket_id: number | null
  description: string
  amount: number | null
  pay_kind: 'invoice' | 'rent' | 'purchase' | null
  ref_id: number | null
  status: 'pending' | 'approved' | 'declined'
  decided_by?: string
  payment?: { amount: number; balance_after: number } | null
}

export interface TicketDecision {
  ticket_id: number
  handled_by: AgentName[]
  finding: string
  decision: string
  status_set: string
  customer_message_draft: string | null
}

export interface TeamReport {
  shop_date: string
  tickets: TicketDecision[]
  approvals_needed: Approval[]
  cash_balance: number | null
  cash_left_if_all_approved: number | null
  summary: string
}

export interface Run {
  run_id: string
  ticket_id: number
  status: 'running' | 'done' | 'error'
  started_at: string
  finished_at?: string
  error?: string
  report?: TeamReport
  approvals: Approval[]
  resolved: boolean
}

export interface ToolUse {
  tool: string
  args: Record<string, unknown>
}

export interface AgentEvent {
  run_id: string
  seq: number
  logged_at: string
  agent: string
  chain: string[]
  event: string
  said: string
  tools: ToolUse[]
  detail: Record<string, unknown>
}

export interface AgentSummary {
  agent: string
  turns: number
  tools: Record<string, number>
  asked: string[]
  asked_by: string[]
  notes: number
  summary: string
  needs_human: number
}

export interface Cash {
  name: string
  balance: number
  date: string
}
