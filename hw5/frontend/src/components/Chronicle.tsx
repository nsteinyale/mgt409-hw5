import type { ReactNode } from 'react'
import type { AgentEvent } from '../types'
import { persona, GANON, TOOL_LABELS } from '../agents'
import { Rupee } from './Art'

function argText(args: Record<string, unknown>): string {
  return Object.values(args)
    .filter((v) => v !== null && v !== undefined && typeof v !== 'object')
    .map(String)
    .join(' · ')
}

function hasRetry(e: AgentEvent): string | null {
  const parts = (e.detail.sending_to_model as Array<Record<string, unknown>> | undefined) ?? []
  const r = parts.find((p) => 'retry' in p)
  return r ? String(r.content ?? '') : null
}

/** One line of the live feed, or null for steps the board doesn't show. */
function Entry({ e }: { e: AgentEvent }) {
  const p = persona(e.agent)
  const time = new Date(e.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const depth = Math.max(0, e.chain.length - 1)
  const to = String(e.detail.to ?? '')

  // A person acted from the dashboard
  if (e.agent.startsWith('Human') || e.agent === 'System') {
    const pay = e.detail.payment as { amount?: number; balance_after?: number } | null | undefined
    return (
      <li className="entry human">
        <div className="entry-icon"><Rupee size={22} /></div>
        <div className="entry-body">
          <div className="entry-head"><b>{e.agent.replace('Human: ', '')}</b> <span className="muted">{e.event.replace('_', ' ')}</span><time>{time}</time></div>
          {pay?.amount != null && <p>Paid ${pay.amount.toFixed(2)}. Checking is now ${pay.balance_after?.toFixed(2)}.</p>}
        </div>
      </li>
    )
  }

  // Guardrails stopped something: Ganondorf shows up
  const retry = e.event === 'model_request' ? hasRetry(e) : null
  if (e.event === 'delegation_refused' || e.event === 'error' || retry) {
    return (
      <li className="entry ganon" style={{ marginLeft: depth * 18 }}>
        <div className="entry-icon"><GANON.Icon size={30} /></div>
        <div className="entry-body">
          <div className="entry-head"><b>Ganondorf</b> <span className="muted">blocks {p.title}</span><time>{time}</time></div>
          <p>{retry ?? String(e.detail.reason ?? e.detail.error ?? 'A rule stopped this step.')}</p>
        </div>
      </li>
    )
  }

  let body: ReactNode = null
  let head = ''
  if (e.event === 'delegation_start') {
    const tp = persona(to)
    head = `summons ${tp.title}`
    body = <p className="task">“{e.said}”</p>
  } else if (e.event === 'delegation_end') {
    head = `hears back from ${persona(to).title}`
    body = <p>{e.said}</p>
  } else if (e.event === 'run_start' && depth > 0) {
    head = 'answers the call'
  } else if (e.event === 'run_end' && depth === 0) {
    head = 'quest report'
    body = <p className="report">{e.said}</p>
  } else if (e.event === 'model_response') {
    const tools = e.tools.filter((t) => t.tool !== 'ask_agent')
    if (!e.said && tools.length === 0) return null
    head = tools.length ? 'acts' : 'speaks'
    body = (
      <>
        {e.said && <p className="said">{e.said}</p>}
        {tools.length > 0 && (
          <div className="chips">
            {tools.map((t, i) => (
              <span className="chip" key={i} title={t.tool}>
                <b>{TOOL_LABELS[t.tool] ?? t.tool}</b>
                <code>{t.tool}</code>
                {argText(t.args) && <em>{argText(t.args)}</em>}
              </span>
            ))}
          </div>
        )}
      </>
    )
  } else {
    return null
  }

  return (
    <li className={`entry ${e.event}`} style={{ marginLeft: depth * 18, ['--c' as string]: p.color }}>
      <div className="entry-icon"><p.Icon size={30} /></div>
      <div className="entry-body">
        <div className="entry-head"><b style={{ color: p.color }}>{p.title}</b> <span className="muted">{head}</span><time>{time}</time></div>
        {body}
      </div>
    </li>
  )
}

export function Chronicle({ events, running }: { events: AgentEvent[]; running: boolean }) {
  return (
    <section className="panel chronicle">
      <h2>The Chronicle <span className="muted">· what each agent says and does</span></h2>
      {events.length === 0 && !running && <p className="empty">No tale yet. Draw the sword to send the party.</p>}
      <ol>
        {events.map((e) => <Entry key={`${e.run_id}-${e.seq}-${e.event}`} e={e} />)}
        {running && <li className="entry waiting"><span className="dots"><i /><i /><i /></span> the party is on the road…</li>}
      </ol>
    </section>
  )
}
