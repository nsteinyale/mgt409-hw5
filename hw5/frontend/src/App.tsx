import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { AgentEvent, AgentSummary, Cash, Run, Ticket } from './types'
import { QUEST_NAMES, persona } from './agents'
import { Chronicle } from './components/Chronicle'
import { Party } from './components/Party'
import { Approvals } from './components/Approvals'
import { Wallet } from './components/Wallet'
import { TwilightSky } from './components/Twilight'
import { Pinball } from './components/Pinball'
import { Intro } from './components/Intro'
import { Portal, Sword, Triforce } from './components/Art'

const POLL_MS = 1500

function ticketLine(t: Ticket): string {
  if (t.sku) return `${t.qty ?? ''} × ${t.sku}${t.size ? ` · size ${t.size}` : ''}`
  if (t.lease_id) return `Lease ${t.lease_id}`
  return t.type
}

function stateLabel(t: Ticket, run: Run | undefined): { text: string; cls: string } {
  if (t.resolved) return { text: 'Light restored', cls: 'resolved' }
  if (run?.status === 'running') return { text: 'Party on the road', cls: 'running' }
  if (run?.status === 'done' && run.approvals.some((a) => a.status === 'pending')) return { text: 'Awaiting your seal', cls: 'waiting' }
  if (t.status === 'waiting_on_human') return { text: 'Awaiting a human', cls: 'waiting' }
  return { text: 'Shrouded in Twilight', cls: 'open' }
}

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [cash, setCash] = useState<Cash | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [events, setEvents] = useState<Record<string, AgentEvent[]>>({})
  const [summaries, setSummaries] = useState<Record<string, AgentSummary[]>>({})
  const [approver, setApprover] = useState(() => localStorage.getItem('twilight-approver') ?? '')
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [pinball, setPinball] = useState(false)
  const [intro, setIntro] = useState(() => !new URLSearchParams(location.search).has('nointro'))
  const lastSeq = useRef<Record<string, number>>({})

  useEffect(() => localStorage.setItem('twilight-approver', approver), [approver])

  const refresh = useCallback(async () => {
    try {
      const [t, c, r] = await Promise.all([api.tickets(), api.cash(), api.runs()])
      setTickets(t); setCash(c); setRuns(r); setOffline(false)
      setSelected((s) => s ?? t[0]?.id ?? null)
    } catch {
      setOffline(true)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const ticket = tickets.find((t) => t.id === selected)
  const run = useMemo(() => runs.find((r) => r.ticket_id === selected), [runs, selected])
  const anyRunning = runs.some((r) => r.status === 'running')
  const runEvents = run ? events[run.run_id] ?? [] : []

  const pullEvents = useCallback(async (runId: string) => {
    const since = lastSeq.current[runId]
    const fresh = await api.events(runId, since)
    if (fresh.length) {
      lastSeq.current[runId] = Math.max(since ?? 0, ...fresh.map((e) => e.seq))
      setEvents((m) => {
        const seen = new Set((m[runId] ?? []).map((e) => `${e.seq}-${e.event}`))
        return { ...m, [runId]: [...(m[runId] ?? []), ...fresh.filter((e) => !seen.has(`${e.seq}-${e.event}`))] }
      })
    }
  }, [])

  // Load the tale and the per-agent summary for a finished run when its ticket is picked.
  useEffect(() => {
    if (!run || run.status === 'running') return
    if (!events[run.run_id]) pullEvents(run.run_id).catch(() => {})
    if (!summaries[run.run_id]) api.agents(run.run_id).then((a) => setSummaries((m) => ({ ...m, [run.run_id]: a }))).catch(() => {})
  }, [run, events, summaries, pullEvents])

  // While a run is going, poll its events and status; when it ends, refresh the whole board.
  useEffect(() => {
    if (!run || run.status !== 'running') return
    const id = run.run_id
    const timer = setInterval(async () => {
      try {
        await pullEvents(id)
        const r = await api.run(id)
        if (r.status !== 'running') {
          await pullEvents(id)
          const a = await api.agents(id)
          setSummaries((m) => ({ ...m, [id]: a }))
          await refresh()
        }
      } catch { /* the next tick retries */ }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [run, pullEvents, refresh])

  const start = async () => {
    if (!ticket) return
    setError(null); setStarting(true)
    try {
      const r = await api.runTicket(ticket.id)
      setRuns((rs) => [r, ...rs])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setStarting(false)
    }
  }

  const decide = async (index: number, decision: 'approve' | 'decline') => {
    if (!run) return
    setError(null); setBusyIndex(index)
    try {
      const res = await api.decide(run.run_id, index, decision, approver.trim())
      setRuns((rs) => rs.map((r) => (r.run_id === res.run.run_id ? res.run : r)))
      await pullEvents(run.run_id)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyIndex(null)
    }
  }

  const reset = async () => {
    if (!confirm('Banish the Twilight? This puts the shop database back to its original values for a fresh run. The audit trail is kept.')) return
    setError(null)
    try {
      await api.reset()
      setEvents({}); setSummaries({}); lastSeq.current = {}
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // The agent acting right now: the newest non-human event while running.
  const active = run?.status === 'running'
    ? [...runEvents].reverse().find((e) => persona(e.agent).key === e.agent)?.agent ?? 'Boss'
    : null
  const decision = run?.report?.tickets.find((d) => d.ticket_id === run.ticket_id)

  return (
    <div className="app">
      <TwilightSky />

      <header className="topbar">
        <div className="brand">
          <Triforce size={34} />
          <div>
            <h1>Campus Customs <span>· Twilight Desk</span></h1>
            <p>Shop date 2026-08-31 · five agents, one human with the final seal</p>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn admin" onClick={() => setPinball(true)} title="Watch the agents ping each other, pinball style">
            ⚔ Admin · Pinball
          </button>
          <Wallet balance={cash?.balance ?? null} date={cash?.date} />
          <button className="btn ghost reset" onClick={reset} disabled={anyRunning} title="Reset the database to the original values">
            Banish the Twilight <small>(reset)</small>
          </button>
        </div>
      </header>

      {offline && (
        <div className="banner bad">
          Can't reach the backend at http://localhost:8000. Start it from <code>backend/</code> with <code>uvicorn main:app --reload --port 8000</code>.
          <button className="btn ghost" onClick={refresh}>Retry</button>
        </div>
      )}
      {error && <div className="banner bad" onClick={() => setError(null)}>{error} <small>(click to dismiss)</small></div>}

      <main className="layout">
        <aside className="quests">
          <h2>Quest Board</h2>
          {tickets.map((t) => {
            const r = runs.find((x) => x.ticket_id === t.id)
            const st = stateLabel(t, r)
            return (
              <button key={t.id} className={`quest ${st.cls} ${selected === t.id ? 'picked' : ''}`} onClick={() => setSelected(t.id)}>
                <div className="quest-top">
                  <span className="quest-id">#{t.id}</span>
                  {t.resolved ? <Triforce size={22} /> : <Portal size={22} className={st.cls === 'running' ? 'spin' : ''} />}
                </div>
                <h3>{QUEST_NAMES[t.id] ?? t.subject}</h3>
                <div className="quest-sub">{t.subject} · {t.requester}</div>
                <div className="quest-line">{ticketLine(t)}</div>
                <div className={`quest-state ${st.cls}`}>{st.text}</div>
              </button>
            )
          })}
        </aside>

        <section className="stage">
          {ticket && (
            <section className={`panel quest-detail ${ticket.resolved ? 'lit' : ''}`}>
              <div className="qd-head">
                <div>
                  <div className="qd-kicker">Ticket {ticket.id} · {ticket.type.replace('_', ' ')}</div>
                  <h2 className="qd-title">{QUEST_NAMES[ticket.id] ?? ticket.subject}</h2>
                  <p className="qd-sub">{ticket.requester} · “{ticket.notes?.split('\n')[0]}”</p>
                </div>
                <button
                  className="btn sword"
                  onClick={start}
                  disabled={ticket.resolved || anyRunning || starting || offline}
                  title={ticket.resolved ? 'This quest is complete' : anyRunning ? 'Another run is going' : 'Run the agent team on this ticket'}
                >
                  <Sword size={26} />
                  {ticket.resolved ? 'Quest complete' : run?.status === 'running' ? 'Party on the road…' : starting ? 'Drawing…' : run ? 'Send the party again' : 'Draw the sword: send the party'}
                </button>
              </div>
              <div className="qd-facts">
                <span>Status <b>{ticket.status.replace(/_/g, ' ')}</b></span>
                {ticket.invoice_id && <span>Invoice <b>{ticket.invoice_id}</b></span>}
                {ticket.lease_id && <span>Lease <b>{ticket.lease_id}</b></span>}
                {run && <span>Run <b>{run.run_id}</b> · {run.status}</span>}
              </div>
              {ticket.resolved && (
                <div className="lit-banner"><Triforce size={22} /> Light restored. This ticket is resolved.</div>
              )}
              {run?.status === 'error' && <div className="banner bad">The run failed: {run.error}</div>}
              {decision && (
                <div className="verdict">
                  <div><b>Finding</b> {decision.finding}</div>
                  <div><b>Decision</b> {decision.decision}</div>
                  {decision.customer_message_draft && (
                    <blockquote><b>Draft to {ticket.requester}</b> {decision.customer_message_draft}</blockquote>
                  )}
                </div>
              )}
            </section>
          )}

          {run && (
            <Approvals run={run} approver={approver} setApprover={setApprover} onDecide={decide} busyIndex={busyIndex} />
          )}

          <Chronicle events={runEvents} running={run?.status === 'running'} />
        </section>

        <aside className="side">
          <Party active={active} summary={run && run.status !== 'running' ? summaries[run.run_id] ?? null : null} running={run?.status === 'running'} />
        </aside>
      </main>

      {intro && <Intro onDone={(choice) => { setIntro(false); if (choice === 'pinball') setPinball(true) }} />}
      {pinball && (
        <Pinball run={run} events={runEvents} onClose={() => setPinball(false)}
          tickets={tickets.map((t) => ({ id: t.id, hasRun: runs.some((r) => r.ticket_id === t.id) }))}
          selected={selected} onPick={setSelected} />
      )}

      <footer>
        Campus Customs · MGT409 HW5 · agents run on gpt-6-luna; only a human seal moves rupees ·
        emblems are original drawings inspired by a twilight adventure ·{' '}
        <button className="linkish" onClick={() => setIntro(true)}>▶ Replay intro</button>
      </footer>
    </div>
  )
}
