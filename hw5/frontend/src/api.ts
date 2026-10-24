import type { AgentEvent, AgentSummary, Cash, Run, Ticket } from './types'

export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.detail ?? `${res.status} ${res.statusText}`)
  return body as T
}

export const api = {
  health: () => call<{ ok: boolean; model: string; running: string | null }>('/api/health'),
  tickets: () => call<{ tickets: Ticket[] }>('/api/tickets').then((r) => r.tickets),
  runTicket: (id: number) => call<Run>(`/api/tickets/${id}/run`, { method: 'POST' }),
  runs: () => call<{ runs: Run[] }>('/api/runs').then((r) => r.runs),
  run: (runId: string) => call<Run>(`/api/runs/${runId}`),
  agents: (runId: string) =>
    call<{ agents: AgentSummary[] }>(`/api/runs/${runId}/agents`).then((r) => r.agents),
  events: (runId: string, sinceSeq?: number) =>
    call<{ events: AgentEvent[] }>(
      `/api/events?run_id=${runId}&limit=500${sinceSeq != null ? `&since_seq=${sinceSeq}` : ''}`,
    ).then((r) => r.events.slice().reverse()),
  decide: (runId: string, index: number, decision: 'approve' | 'decline', approvedBy: string) =>
    call<{ run: Run; ticket_resolved: boolean }>(`/api/runs/${runId}/approvals/${index}`, {
      method: 'POST',
      body: JSON.stringify({ decision, approved_by: approvedBy }),
    }),
  cash: () => call<Cash>('/api/cash'),
  reset: () => call<{ reset: boolean }>('/api/reset', { method: 'POST' }),
}
