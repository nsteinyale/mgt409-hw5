import type { AgentSummary } from '../types'
import { PARTY, PERSONAS, TOOL_LABELS } from '../agents'

/** The five agents. Live: who is acting now. After a run: what each one actually did. */
export function Party({ active, summary, running }: { active: string | null; summary: AgentSummary[] | null; running: boolean }) {
  const byName = Object.fromEntries((summary ?? []).map((s) => [s.agent, s]))
  return (
    <section className="panel party">
      <h2>The Party <span className="muted">· {summary ? 'what each one actually did' : running ? 'who is acting now' : 'the five agents'}</span></h2>
      <div className="party-grid">
        {PARTY.map((name) => {
          const p = PERSONAS[name]
          const s = byName[name]
          const joined = !!s
          const idle = summary && !joined
          const tools = s ? Object.entries(s.tools).sort((a, b) => b[1] - a[1]) : []
          return (
            <article
              key={name}
              className={`member ${active === name ? 'active' : ''} ${idle ? 'idle' : ''} ${joined ? 'joined' : ''}`}
              style={{ ['--c' as string]: p.color }}
            >
              <header>
                <div className="sigil"><p.Icon size={44} /></div>
                <div>
                  <h3>{p.title}</h3>
                  <div className="role">{p.role}</div>
                </div>
                {active === name && <span className="speaking">acting</span>}
              </header>
              {!summary && <p className="motto">{p.motto}</p>}
              {idle && <p className="motto">Stayed at camp. This quest didn't need them.</p>}
              {s && (
                <div className="did">
                  <div className="stats">
                    {s.asked_by.length > 0 && <span>summoned by {s.asked_by.map((a) => PERSONAS[a]?.title ?? a).join(', ')}</span>}
                    {s.asked.length > 0 && <span>summoned {s.asked.map((a) => PERSONAS[a]?.title ?? a).join(', ')}</span>}
                    {s.notes > 0 && <span>{s.notes} note{s.notes > 1 ? 's' : ''}</span>}
                    {s.needs_human > 0 && <span className="ask">{s.needs_human} for you</span>}
                  </div>
                  {tools.length > 0 && (
                    <div className="chips small">
                      {tools.map(([t, n]) => (
                        <span className="chip" key={t} title={t}><b>{TOOL_LABELS[t] ?? t}</b>{n > 1 && <em>×{n}</em>}</span>
                      ))}
                    </div>
                  )}
                  {s.summary && <p className="summary">{s.summary}</p>}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
