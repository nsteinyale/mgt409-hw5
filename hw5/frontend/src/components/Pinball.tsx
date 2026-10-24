import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentEvent, Run } from '../types'
import { PARTY, PERSONAS, QUEST_NAMES, TOOL_LABELS, GANON } from '../agents'
import { ArrowShape, OctorokShape, Portal, Rupee } from './Art'
import { PITCH, isMuted, play, setMuted } from '../sfx'

/* Admin pinball view (after the Lecture 10 pinball org chart), Twilight style.
   Every agent can call every other one, so the table is a pentagon with a wire between each pair.
   - a delegation fires a Hero's ARROW down the wire from caller to teammate
   - the answer comes back as an OCTOROK rolling the other way
   - a tool call flashes the agent like a bumper and pops the tool's name
   - a guardrail stop summons Ganondorf in the middle; a human approval drops a rupee */

const W = 1000
const H = 620
const CENTER = { x: 500, y: 330 }
const POS: Record<string, { x: number; y: number }> = {
  Boss: { x: 500, y: 100 },
  Inventory: { x: 150, y: 285 },
  Accounting: { x: 850, y: 285 },
  Facilities: { x: 285, y: 525 },
  CustomerService: { x: 715, y: 525 },
}
const FLIGHT_MS = 950

type Pair = [string, string]
const pairKey = (a: string, b: string) => [a, b].sort().join('|')

function wirePath(a: string, b: string): string {
  const [p, q] = [a, b].sort().map((n) => POS[n])
  const mx = (p.x + q.x) / 2
  const my = (p.y + q.y) / 2
  // bow each wire away from the middle so the ten wires don't overlap
  let dx = mx - CENTER.x
  let dy = my - CENTER.y
  const len = Math.hypot(dx, dy)
  if (len < 40) { dx = -(q.y - p.y); dy = q.x - p.x } // through the centre: bow sideways
  const n = Math.hypot(dx, dy) || 1
  const bow = len < 40 ? 70 : 55
  return `M ${p.x} ${p.y} Q ${mx + (dx / n) * bow} ${my + (dy / n) * bow} ${q.x} ${q.y}`
}

const PAIRS: Pair[] = PARTY.flatMap((a, i) => PARTY.slice(i + 1).map((b) => [a, b] as Pair))
const PATHS: Record<string, string> = Object.fromEntries(PAIRS.map(([a, b]) => [pairKey(a, b), wirePath(a, b)]))

interface Shot { id: number; key: string; from: string; to: string; kind: 'arrow' | 'octorok' }
interface Pop { id: number; agent: string; text: string; tone: 'tool' | 'say' | 'bad' | 'gold' }
interface Ping { id: number; text: string; color: string; icon: 'arrow' | 'octorok' | 'bad' | 'rupee' | 'gold' }
interface Score { arrows: number; octoroks: number; tools: Record<string, number>; blocks: number; approvals: number }

const emptyScore = (): Score => ({ arrows: 0, octoroks: 0, tools: {}, blocks: 0, approvals: 0 })
const evKey = (e: AgentEvent) => `${e.run_id}-${e.seq}-${e.event}`
const isRetry = (e: AgentEvent) =>
  e.event === 'model_request' &&
  ((e.detail.sending_to_model as Array<Record<string, unknown>> | undefined) ?? []).some((p) => 'retry' in p)
const usedTools = (e: AgentEvent) => e.tools.filter((t) => t.tool !== 'ask_agent' && t.tool !== 'final_result')
const title = (a: string) => PERSONAS[a]?.title ?? a

function tally(events: AgentEvent[]): Score {
  const s = emptyScore()
  for (const e of events) {
    if (e.event === 'delegation_start') s.arrows++
    else if (e.event === 'delegation_end') s.octoroks++
    else if (e.event === 'model_response') s.tools[e.agent] = (s.tools[e.agent] ?? 0) + usedTools(e).length
    else if (e.event === 'delegation_refused' || e.event === 'error' || isRetry(e)) s.blocks++
    if (e.agent.startsWith('Human')) s.approvals++
  }
  return s
}

export function Pinball({ run, events, onClose, tickets = [], selected = null, onPick }: {
  run: Run | undefined
  events: AgentEvent[]
  onClose: () => void
  tickets?: { id: number; hasRun: boolean }[]
  selected?: number | null
  onPick?: (id: number) => void
}) {
  const [shots, setShots] = useState<Shot[]>([])
  const [pops, setPops] = useState<Pop[]>([])
  const [pings, setPings] = useState<Ping[]>([])
  const [hits, setHits] = useState<Record<string, number>>({})
  const [live, setLive] = useState<Record<string, string>>({}) // wire key -> color while a shot is on it
  const [ganon, setGanon] = useState(0)
  const [rupee, setRupee] = useState(0)
  const [score, setScore] = useState<Score>(() => tally(events))
  const [muted, setMute] = useState(isMuted())
  const [speed, setSpeed] = useState(1)
  const [replaying, setReplaying] = useState(false)

  const seen = useRef<Set<string>>(new Set(events.map(evKey))) // already-happened steps don't re-fire on open
  const queue = useRef<AgentEvent[]>([])
  const nextId = useRef(1)
  const runId = run?.run_id

  // A new run (or a different ticket) starts from a clean table.
  useEffect(() => {
    seen.current = new Set(events.map(evKey))
    queue.current = []
    setScore(tally(events))
    setShots([]); setPops([]); setPings([]); setLive({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  const bump = useCallback((agent: string, delay = 0) => {
    window.setTimeout(() => setHits((h) => ({ ...h, [agent]: (h[agent] ?? 0) + 1 })), delay)
  }, [])

  const pop = useCallback((agent: string, text: string, tone: Pop['tone']) => {
    const id = nextId.current++
    setPops((p) => [...p.slice(-10), { id, agent, text, tone }])
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 2200)
  }, [])

  const ping = useCallback((text: string, color: string, icon: Ping['icon']) => {
    const id = nextId.current++
    setPings((p) => [{ id, text, color, icon }, ...p].slice(0, 14))
  }, [])

  const shoot = useCallback((from: string, to: string, kind: Shot['kind']) => {
    if (!POS[from] || !POS[to]) return
    const id = nextId.current++
    const key = pairKey(from, to)
    setShots((s) => [...s, { id, key, from, to, kind }])
    setLive((l) => ({ ...l, [key]: PERSONAS[from]?.color ?? '#36d3c0' }))
    window.setTimeout(() => {
      setShots((s) => s.filter((x) => x.id !== id))
      setLive((l) => { const n = { ...l }; delete n[key]; return n })
    }, FLIGHT_MS + 250)
    bump(from)
    bump(to, FLIGHT_MS)
  }, [bump])

  const fire = useCallback((e: AgentEvent) => {
    const to = String(e.detail.to ?? '')
    const pitch = PITCH[e.agent] ?? 1
    if (e.event === 'delegation_start') {
      play('arrow', pitch)
      shoot(e.agent, to, 'arrow')
      setScore((s) => ({ ...s, arrows: s.arrows + 1 }))
      ping(`${title(e.agent)} ➶ ${title(to)}: ${e.said.slice(0, 90)}`, PERSONAS[e.agent]?.color ?? '#fff', 'arrow')
    } else if (e.event === 'delegation_end') {
      play('octorok', PITCH[to] ?? 1)
      shoot(to, e.agent, 'octorok')
      setScore((s) => ({ ...s, octoroks: s.octoroks + 1 }))
      ping(`${title(to)} ↩ ${title(e.agent)}: ${e.said.slice(0, 90)}`, PERSONAS[to]?.color ?? '#fff', 'octorok')
    } else if (e.event === 'delegation_refused' || e.event === 'error' || isRetry(e)) {
      play('growl')
      setGanon((g) => g + 1)
      pop(e.agent, 'blocked by a rule', 'bad')
      setScore((s) => ({ ...s, blocks: s.blocks + 1 }))
      ping(`Ganondorf blocks ${title(e.agent)}: ${String(e.detail.reason ?? e.detail.error ?? 'guardrail sent it back').slice(0, 90)}`, GANON.color, 'bad')
    } else if (e.event === 'model_response') {
      const tools = usedTools(e)
      if (tools.length) {
        tools.slice(0, 3).forEach(() => play('tick', pitch))
        bump(e.agent)
        pop(e.agent, tools.map((t) => TOOL_LABELS[t.tool] ?? t.tool).join(' · '), 'tool')
        setScore((s) => ({ ...s, tools: { ...s.tools, [e.agent]: (s.tools[e.agent] ?? 0) + tools.length } }))
      } else if (e.said) {
        bump(e.agent)
        pop(e.agent, e.said.slice(0, 60) + (e.said.length > 60 ? '…' : ''), 'say')
      }
    } else if (e.event === 'run_end' && e.chain.length === 1) {
      play('chime')
      bump('Boss')
      pop('Boss', 'quest report!', 'gold')
      ping(`The Hero reports: ${e.said.slice(0, 100)}`, PERSONAS.Boss.color, 'gold')
    } else if (e.agent.startsWith('Human')) {
      play('rupee')
      setRupee((r) => r + 1)
      setScore((s) => ({ ...s, approvals: s.approvals + 1 }))
      ping(`${e.agent} ${e.event.replace(/_/g, ' ')}`, '#57c98a', 'rupee')
    }
  }, [bump, pop, ping, shoot])

  // New events join the queue; a steady beat plays them so hand-offs don't all land at once.
  useEffect(() => {
    for (const e of events) {
      const k = evKey(e)
      if (!seen.current.has(k)) { seen.current.add(k); queue.current.push(e) }
    }
  }, [events])

  useEffect(() => {
    const beat = window.setInterval(() => {
      // skip quiet steps so the beat is spent on visible ones
      let e = queue.current.shift()
      while (e && !isVisible(e)) e = queue.current.shift()
      if (e) fire(e)
      else if (replaying) setReplaying(false)
    }, 520 / speed)
    return () => window.clearInterval(beat)
  }, [fire, speed, replaying])

  const replay = () => {
    play('tick') // unlocks audio on the click
    queue.current = [...events]
    setScore(emptyScore())
    setPings([])
    setReplaying(true)
  }

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const running = run?.status === 'running'
  const toolTotal = useMemo(() => Object.values(score.tools).reduce((a, b) => a + b, 0), [score])

  return (
    <div className="pinball-overlay" role="dialog" aria-label="Admin pinball view">
      <header className="pb-head">
        <div>
          <div className="qd-kicker">Admin · Twilight Pinball</div>
          <h2>{run ? `Ticket ${run.ticket_id}: ${QUEST_NAMES[run.ticket_id] ?? ''}` : 'No run yet'}</h2>
          <p className="muted">
            {run ? <>Run <b>{run.run_id}</b> · {running ? 'live: the party is on the road' : replaying ? 'replaying' : run.status}</> : 'Pick a ticket and draw the sword, then watch the agents ping each other here.'}
          </p>
        </div>
        <div className="pb-actions">
          {tickets.length > 0 && (
            <div className="speed pb-tickets" title="Pick which ticket's run to watch">
              {tickets.map((t) => (
                <button key={t.id} className={`btn ghost ${selected === t.id ? 'on' : ''}`} onClick={() => onPick?.(t.id)} disabled={!t.hasRun}>
                  #{t.id}
                </button>
              ))}
            </div>
          )}
          <button className="btn sword" onClick={replay} disabled={!events.length || running}>
            ▶ {replaying ? 'Replaying…' : 'Replay this run'}
          </button>
          <div className="speed">
            {[1, 2, 4].map((s) => (
              <button key={s} className={`btn ghost ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
          </div>
          <button className="btn ghost" onClick={() => { setMuted(!muted); setMute(!muted); if (muted) play('tick') }}>
            {muted ? '🔇 Sound off' : '🔊 Sound on'}
          </button>
          <button className="btn ghost" onClick={onClose}>✕ Close</button>
        </div>
      </header>

      <div className="pb-body">
        <div className="arena">
          <svg viewBox={`0 0 ${W} ${H}`} className="arena-svg" aria-hidden>
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id="floor" cx="50%" cy="52%" r="60%">
                <stop offset="0" stopColor="#12302c" />
                <stop offset=".7" stopColor="#081315" />
                <stop offset="1" stopColor="#050a0b" />
              </radialGradient>
              <pattern id="runes" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="40" height="40" fill="none" />
                <path d="M0 20 H40 M20 0 V40" stroke="#36d3c0" strokeWidth=".6" opacity=".08" />
              </pattern>
            </defs>
            <rect x="10" y="10" width={W - 20} height={H - 20} rx="38" fill="url(#floor)" stroke="#1c7f75" strokeWidth="2" />
            <rect x="10" y="10" width={W - 20} height={H - 20} rx="38" fill="url(#runes)" />
            <polygon
              points={PARTY.map((a) => `${POS[a].x},${POS[a].y}`).join(' ')}
              fill="none" stroke="#e86a2c" strokeOpacity=".18" strokeWidth="1.5" strokeDasharray="4 8"
            />

            {PAIRS.map(([a, b]) => {
              const k = pairKey(a, b)
              const c = live[k]
              return (
                <g key={k} className={`pb-wire ${c ? 'live' : ''}`} style={{ ['--c' as string]: c ?? '#36d3c0' }}>
                  <path d={PATHS[k]} className="pb-wire-base" />
                  {c && <path d={PATHS[k]} className="pb-wire-lit" filter="url(#glow)" />}
                  {c && <path d={PATHS[k]} className="pb-wire-march" />}
                </g>
              )
            })}

            {shots.map((s) => {
              const [first] = s.key.split('|')
              const forward = s.from === first
              return (
                <g key={s.id} filter="url(#glow)">
                  {s.kind === 'arrow' ? <ArrowShape color={PERSONAS[s.from]?.color} /> : <OctorokShape />}
                  <animateMotion
                    ref={(el) => {
                      const anim = el as unknown as SVGAnimationElement | null
                      if (anim && !anim.dataset.started) { anim.dataset.started = '1'; anim.beginElement() }
                    }}
                    begin="indefinite"
                    dur={`${FLIGHT_MS}ms`}
                    path={PATHS[s.key]}
                    rotate={forward ? 'auto' : 'auto-reverse'}
                    keyPoints={forward ? '0;1' : '1;0'}
                    keyTimes="0;1"
                    calcMode="linear"
                    fill="freeze"
                  />
                </g>
              )
            })}
          </svg>

          <div className={`pb-center ${ganon ? 'ganon' : ''}`} key={`g${ganon}-r${rupee}`}>
            {ganon > 0 && <div className="ganon-flash"><GANON.Icon size={92} /></div>}
            {rupee > 0 && <div className="rupee-drop"><Rupee size={34} /></div>}
            <Portal size={70} className={running || replaying ? 'spin' : ''} />
          </div>

          {PARTY.map((a) => {
            const p = PERSONAS[a]
            const pos = POS[a]
            return (
              <div key={a} className="pb-node" style={{ left: `${(pos.x / W) * 100}%`, top: `${(pos.y / H) * 100}%`, ['--c' as string]: p.color }}>
                {hits[a] ? <span key={hits[a]} className="bumper-flash" aria-hidden /> : null}
                <div className="pb-sigil"><p.Icon size={58} /></div>
                <div className="pb-name">{p.title}</div>
                <div className="pb-role">{p.role} · {score.tools[a] ?? 0} tools</div>
                <div className="pb-pops">
                  {pops.filter((x) => x.agent === a).slice(-2).map((x) => (
                    <span key={x.id} className={`pb-pop ${x.tone}`}>{x.text}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <aside className="pb-side">
          <div className="scoreboard">
            <div><b>{score.arrows}</b><span>arrows fired<br /><small>delegations</small></span></div>
            <div><b>{score.octoroks}</b><span>octoroks back<br /><small>answers</small></span></div>
            <div><b>{toolTotal}</b><span>bumper hits<br /><small>tool calls</small></span></div>
            <div className="bad"><b>{score.blocks}</b><span>Ganondorf<br /><small>guardrail stops</small></span></div>
          </div>
          <h3>Ping log</h3>
          {pings.length === 0 && (
            <p className="empty">{events.length ? 'Press Replay to watch this run ping back and forth.' : 'Waiting for the first arrow…'}</p>
          )}
          <ol className="pings">
            {pings.map((p) => (
              <li key={p.id} style={{ ['--c' as string]: p.color }}>
                <span className="ping-icon">{p.icon === 'arrow' ? '➶' : p.icon === 'octorok' ? '↩' : p.icon === 'bad' ? '⛔' : p.icon === 'rupee' ? '◆' : '★'}</span>
                {p.text}
              </li>
            ))}
          </ol>
          <div className="legend">
            <span><svg width="46" height="16" viewBox="-48 -9 76 18"><ArrowShape /></svg> arrow = one agent hands work to another</span>
            <span><svg width="46" height="22" viewBox="-42 -14 70 30"><OctorokShape /></svg> octorok = the answer coming back</span>
            <span><GANON.Icon size={20} /> Ganondorf = a rule stopped something</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function isVisible(e: AgentEvent): boolean {
  if (['delegation_start', 'delegation_end', 'delegation_refused', 'error'].includes(e.event)) return true
  if (e.event === 'model_response') return usedTools(e).length > 0 || !!e.said
  if (e.event === 'run_end') return e.chain.length === 1
  if (isRetry(e)) return true
  return e.agent.startsWith('Human')
}
