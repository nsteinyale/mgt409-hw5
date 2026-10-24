import { useCallback, useEffect, useState } from 'react'
import './intro.css'
import { ArrowShape, OctorokShape, Portal, Sword, Triforce } from './Art'
import { IntroMotes } from './IntroMotes'
import { play, playIntro } from '../sfx'

/* A video-game style intro, drawn and animated in code (SVG + CSS keyframes + a canvas, no video file).
   "Cinematic" pass: noise-generated clouds and drifting fog, blurred crepuscular rays, depth of field
   (far layers soft, foreground blurred), rough organic edges, shaded and rim-lit Hero, parallax camera,
   then on top: dust motes, bokeh and Twilight shards (canvas), bloom, lens flare, colour grade,
   vignette and film grain.
   Title "PRESS START" → Twilight lifts into dawn, the Hero asleep → "!" → walks to the stone →
   pulls the sword → raises it in a burst of light → camera dives into the blade → the Twilight Desk.
   Original artwork, inspired by a twilight adventure. The first version is kept in ./classic. */

const LENGTH_MS = 11000
const DIVE_MS = 8150 // when the camera starts diving into the blade
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** A pine with jagged, tiered branches (x = trunk centre, y = ground, h = height, w = width). */
function pine(x: number, y: number, h: number, w: number): string {
  const tiers = 5
  let d = `M${x} ${y - h}`
  for (let t = 0; t < tiers; t++) {
    const ty = y - h + ((t + 1) * h) / (tiers + 0.6)
    const tw = (w / 2) * (0.35 + (0.65 * (t + 1)) / tiers)
    d += ` L${x + tw} ${ty} L${x + tw * 0.45} ${ty - h * 0.045}`
  }
  d += ` L${x + w * 0.08} ${y} L${x - w * 0.08} ${y}`
  for (let t = tiers - 1; t >= 0; t--) {
    const ty = y - h + ((t + 1) * h) / (tiers + 0.6)
    const tw = (w / 2) * (0.35 + (0.65 * (t + 1)) / tiers)
    d += ` L${x - tw * 0.45} ${ty - h * 0.045} L${x - tw} ${ty}`
  }
  return d + ' Z'
}

/** A broken temple pillar with fluting, a capital and a jagged top. */
function Pillar({ x, h, lean = 0 }: { x: number; h: number; lean?: number }) {
  const top = 712 - h
  return (
    <g transform={`rotate(${lean} ${x} 712)`}>
      <rect x={x - 26} y={704} width={52} height={14} fill="#8a918a" stroke="#2f3532" strokeWidth="2" />
      <path d={`M${x - 20} 704 L${x - 20} ${top + 10} L${x - 8} ${top} L${x + 2} ${top + 12} L${x + 12} ${top + 2} L${x + 20} ${top + 14} L${x + 20} 704 Z`} fill="url(#stoneG)" stroke="#2f3532" strokeWidth="2" />
      {[-12, -4, 4, 12].map((dx) => <path key={dx} d={`M${x + dx} 702 V ${top + 18}`} stroke="#4a524b" strokeWidth="1.4" opacity=".55" />)}
      <path d={`M${x - 20} ${top + 40 + h * 0.2} q 12 10 20 -2 q 10 14 20 4`} stroke="#3e6a36" strokeWidth="6" fill="none" opacity=".85" />
      <path d={`M${x + 14} ${top + 30} q -4 40 6 80 q -8 30 2 60`} stroke="#2f5a2f" strokeWidth="2.5" fill="none" />
      {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={x + 16 + (i % 2) * 4} cy={top + 50 + i * 34} rx="5" ry="3" fill="#4d8a3a" />)}
    </g>
  )
}

export type IntroChoice = 'tickets' | 'pinball'

export function Intro({ onDone }: { onDone: (choice: IntroChoice) => void }) {
  const [phase, setPhase] = useState<'title' | 'play' | 'menu' | 'out'>('title')
  const [diving, setDiving] = useState(false)

  // the cinematic (or Skip / Esc) ends on the choice screen
  const finish = useCallback(() => setPhase((p) => (p === 'out' ? p : 'menu')), [])

  const choose = useCallback((c: IntroChoice) => {
    play('tick')
    setPhase('out')
    window.setTimeout(() => onDone(c), 450)
  }, [onDone])

  const start = useCallback(() => {
    if (phase !== 'title') return
    play('tick') // the click unlocks audio
    playIntro()
    setPhase('play')
  }, [phase])

  useEffect(() => {
    if (phase !== 'play') return
    // the dive: drop the heavy filters so a 16x zoom doesn't make the browser re-render them every frame
    const d = window.setTimeout(() => setDiving(true), DIVE_MS)
    if (new URLSearchParams(location.search).has('introhold')) return () => window.clearTimeout(d) // testing: hold
    const t = window.setTimeout(finish, LENGTH_MS)
    return () => { window.clearTimeout(t); window.clearTimeout(d) }
  }, [phase, finish])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'menu') {
        if (e.key === '1' || e.key === 'Enter') choose('tickets')
        else if (e.key === '2') choose('pinball')
      } else if (e.key === 'Escape') finish()
      else if (phase === 'title') start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start, finish, choose])

  return (
    <div className={`intro ${phase}${diving ? ' diving' : ''}`} onClick={phase === 'title' ? start : undefined}>
      {(phase === 'title' || phase === 'play') && (
        <button className="intro-skip" onClick={(e) => { e.stopPropagation(); finish() }}>
          Skip intro ▸▸
        </button>
      )}

      {(phase === 'menu' || phase === 'out') && (
        <div className="choose-screen">
          <div className="title-portal"><Portal size={300} className="spin slow" /></div>
          <Triforce size={56} className="title-tri" />
          <h1>CAMPUS CUSTOMS</h1>
          <h2>~ choose your path ~</h2>
          <div className="choices">
            <button className="choice tickets" onClick={() => choose('tickets')}>
              <span className="choice-art"><Sword size={84} /></span>
              <span className="choice-title">Tickets Dashboard</span>
              <span className="choice-sub">Pick a ticket, send the agent party, approve payments and watch the rupees.</span>
              <kbd>1</kbd>
            </button>
            <button className="choice pinball" onClick={() => choose('pinball')}>
              <span className="choice-art">
                <svg width="150" height="84" viewBox="-80 -42 160 84" aria-hidden>
                  <path d="M-70 10 Q 0 -60 70 10" stroke="#5af0dc" strokeWidth="2" strokeDasharray="4 6" fill="none" />
                  <g transform="translate(-22 -18) rotate(-24)"><ArrowShape color="#e8c15a" /></g>
                  <g transform="translate(34 14) rotate(200) scale(.9)"><OctorokShape /></g>
                </svg>
              </span>
              <span className="choice-title">Pinball-Style Agentic Dashboard Replays</span>
              <span className="choice-sub">Watch the Boss and the agents ping each other back and forth, live or replayed.</span>
              <kbd>2</kbd>
            </button>
          </div>
        </div>
      )}

      {phase === 'title' && (
        <div className="title-screen">
          <div className="title-portal"><Portal size={260} className="spin slow" /></div>
          <Triforce size={70} className="title-tri" />
          <h1>CAMPUS CUSTOMS</h1>
          <h2>~ Twilight Desk ~</h2>
          <p className="press">— PRESS START —</p>
          <p className="hint">click anywhere or press any key · Esc skips</p>
        </div>
      )}

      {phase === 'play' && (
        <>
          <svg className="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <defs>
              {/* sky and light */}
              <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1f2c55" />
                <stop offset=".35" stopColor="#7a4a5e" />
                <stop offset=".58" stopColor="#d9784a" />
                <stop offset=".78" stopColor="#f7b766" />
                <stop offset="1" stopColor="#ffe3ae" />
              </linearGradient>
              <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#010304" />
                <stop offset=".6" stopColor="#081d1f" />
                <stop offset="1" stopColor="#0f3532" />
              </linearGradient>
              <radialGradient id="sun" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#fffbe6" />
                <stop offset=".25" stopColor="#ffe7a0" />
                <stop offset=".6" stopColor="#ffb860" stopOpacity=".55" />
                <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="holy" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <stop offset=".3" stopColor="#fff6cf" stopOpacity=".75" />
                <stop offset="1" stopColor="#fff2b0" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="rayG" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#fffbe8" stopOpacity=".95" />
                <stop offset="1" stopColor="#fff2c0" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="sunRayG" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#ffe0a0" stopOpacity=".55" />
                <stop offset="1" stopColor="#ffe0a0" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" />
                <stop offset=".75" stopColor="#fff" />
                <stop offset="1" stopColor="#000" />
              </linearGradient>
              <mask id="skyMask"><rect x="-400" width="2400" height="560" fill="url(#skyFade)" /></mask>

              {/* land, foliage, stone */}
              <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d6a5a" /><stop offset="1" stopColor="#3a4a3e" /></linearGradient>
              <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3c5a40" /><stop offset="1" stopColor="#24402c" /></linearGradient>
              <linearGradient id="groundG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4d7a3e" /><stop offset=".35" stopColor="#2f5a2f" /><stop offset="1" stopColor="#142a18" /></linearGradient>
              <linearGradient id="treeG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0c1a12" /><stop offset=".7" stopColor="#173322" /><stop offset="1" stopColor="#3a4a2a" /></linearGradient>
              <radialGradient id="canopyG" cx="70%" cy="35%" r="75%"><stop offset="0" stopColor="#4a6a36" /><stop offset=".5" stopColor="#24432b" /><stop offset="1" stopColor="#0f2116" /></radialGradient>
              <linearGradient id="stoneG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b8bfb6" /><stop offset=".5" stopColor="#80897f" /><stop offset="1" stopColor="#4a524b" /></linearGradient>
              <linearGradient id="bladeG" x1="0" x2="1"><stop offset="0" stopColor="#a9bccb" /><stop offset=".45" stopColor="#ffffff" /><stop offset=".55" stopColor="#e9f2f7" /><stop offset="1" stopColor="#6f8797" /></linearGradient>
              <linearGradient id="goldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff0b0" /><stop offset=".5" stopColor="#e8c15a" /><stop offset="1" stopColor="#8a6a1e" /></linearGradient>

              {/* the Hero's materials, lit from the sunrise on the right */}
              <linearGradient id="tunicG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1f4f1e" /><stop offset=".55" stopColor="#3b8a36" /><stop offset="1" stopColor="#7cc25a" /></linearGradient>
              <linearGradient id="capG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1c4a1b" /><stop offset="1" stopColor="#5fae48" /></linearGradient>
              <radialGradient id="skinG" cx="65%" cy="40%" r="70%"><stop offset="0" stopColor="#ffe2c4" /><stop offset=".6" stopColor="#efc199" /><stop offset="1" stopColor="#b98460" /></radialGradient>
              <linearGradient id="hairG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0a0" /><stop offset="1" stopColor="#c99a30" /></linearGradient>
              <radialGradient id="shieldG" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#6d8fd6" /><stop offset=".6" stopColor="#2b4f9c" /><stop offset="1" stopColor="#14265a" /></radialGradient>
              <radialGradient id="shadowG" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>

              {/* filters: noise clouds and fog, rough edges, depth of field, glow */}
              <filter id="clouds" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.009" numOctaves="5" seed="7" />
                <feColorMatrix values="0 0 0 0 1   0 0 0 0 0.9   0 0 0 0 0.85   0 0 0 2.1 -1.05" />
              </filter>
              <filter id="cloudsWarm" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.003 0.014" numOctaves="4" seed="21" />
                <feColorMatrix values="0 0 0 0 1   0 0 0 0 .72   0 0 0 0 .5   0 0 0 2.4 -1.35" />
              </filter>
              <linearGradient id="mountG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8d8aa8" /><stop offset=".6" stopColor="#6e7690" /><stop offset="1" stopColor="#5c6a72" /></linearGradient>
              <radialGradient id="portalG" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#5af0dc" stopOpacity=".35" /><stop offset=".45" stopColor="#0b3a38" stopOpacity=".55" /><stop offset=".8" stopColor="#020405" stopOpacity=".6" /><stop offset="1" stopColor="#020405" stopOpacity="0" /></radialGradient>
              <linearGradient id="pondG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7b766" /><stop offset=".5" stopColor="#c9785a" /><stop offset="1" stopColor="#3a4a66" /></linearGradient>
              <radialGradient id="runeGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#bffcf2" /><stop offset="1" stopColor="#36d3c0" stopOpacity="0" /></radialGradient>
              <filter id="fog" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.02" numOctaves="4" seed="11" />
                <feColorMatrix values="0 0 0 0 .86   0 0 0 0 .93   0 0 0 0 .92   0 0 0 1.7 -.72" />
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="9" />
              </filter>
              <filter id="dofFar"><feGaussianBlur stdDeviation="3.2" /></filter>
              <filter id="dofMid"><feGaussianBlur stdDeviation="1.1" /></filter>
              <filter id="dofNear" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
              <filter id="rayBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="rim" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2.5" dy="-1" stdDeviation="1.2" floodColor="#ffd890" floodOpacity=".75" />
                <feDropShadow dx="-1" dy="2" stdDeviation="2" floodColor="#0b1a12" floodOpacity=".5" />
              </filter>
            </defs>

            {/* the camera: everything inside dives into the blade at the end */}
            <g className="camera">
              {/* sky (barely moves) */}
              <g className="layer sky">
                <rect x="-200" y="-100" width="2000" height="1100" fill="url(#dawn)" />
                <circle className="sun" cx="1180" cy="600" r="360" fill="url(#sun)" />
                <g className="clouds" mask="url(#skyMask)">
                  <rect x="-400" y="0" width="2400" height="560" filter="url(#clouds)" opacity=".55" style={{ mixBlendMode: 'soft-light' }} />
                  <rect x="-400" y="0" width="2400" height="560" filter="url(#clouds)" opacity=".28" />
                  {/* sunlit undersides: warm rims on the clouds nearest the sun */}
                  <rect className="cloud-rims" x="-400" y="180" width="2400" height="340" filter="url(#cloudsWarm)" opacity=".7" style={{ mixBlendMode: 'screen' }} />
                </g>
                {/* distant snow-capped mountains, hazy blue */}
                <g opacity=".75">
                  <path d="M-200 520 L 40 360 L 140 420 L 300 300 L 430 400 L 560 330 L 700 430 L 820 360 L 980 450 L 1120 340 L 1260 420 L 1400 320 L 1560 410 L 1800 360 V 560 H -200 Z" fill="url(#mountG)" />
                  <path d="M270 322 L300 300 L332 326 L316 322 L300 334 L286 324 Z M1376 340 L1400 320 L1426 344 L1410 338 L1398 350 L1388 340 Z M1100 354 L1120 340 L1142 358 L1126 354 L1118 364 Z M24 372 L40 360 L60 376 L46 372 Z" fill="#f3ecf2" opacity=".85" />
                </g>
                <rect className="night" x="-200" y="-100" width="2000" height="1100" fill="url(#night)" />
                <g className="moon"><circle cx="230" cy="120" r="34" fill="#f4f0dc" /><circle cx="246" cy="112" r="32" fill="#1f2c55" opacity=".92" /></g>
                <g className="birds" stroke="#2a2030" strokeWidth="3" fill="none" strokeLinecap="round">
                  {range(5).map((i) => (
                    <path key={i} className={`bird b${i}`} d={`M${560 + i * 46} ${250 + (i % 2) * 22} q 9 -9 18 0 q 9 -9 18 0`} />
                  ))}
                </g>
                <g className="stars">
                  {range(70).map((i) => (
                    <circle key={i} cx={(i * 397) % 1600} cy={(i * 131) % 460} r={((i * 7) % 3) * 0.6 + 0.6} fill="#e8fffb" opacity={0.4 + ((i * 13) % 6) / 10} />
                  ))}
                </g>
              </g>

              {/* crepuscular rays from the sun through the trees */}
              <g className="layer far sunrays" filter="url(#rayBlur)" style={{ mixBlendMode: 'screen' }}>
                {range(7).map((i) => (
                  <polygon key={i} points={`1180,600 ${-200 + i * 170},${-80 + (i % 2) * 40} ${-120 + i * 170},${-80 + (i % 2) * 40}`} fill="url(#sunRayG)" opacity={0.35 + (i % 3) * 0.12} />
                ))}
              </g>

              {/* far hills, soft focus */}
              <g className="layer far" filter="url(#dofFar)">
                <path d="M-200 575 Q 150 470 420 535 T 820 515 T 1220 525 T 1800 495 V 900 H -200 Z" fill="url(#hillFar)" opacity=".9" />
                {/* a distant castle on the far ridge (original silhouette) */}
                <g fill="#4a5565" opacity=".8">
                  <path d="M640 520 V 470 h10 v-8 h8 v8 h10 v-8 h8 v8 h10 V 520 Z" />
                  <path d="M700 520 V 430 l14 -26 l14 26 V 520 Z" />
                  <path d="M735 520 V 455 h12 v-10 h8 v10 h12 V 520 Z" />
                  <path d="M772 520 V 445 l10 -20 l10 20 V 520 Z" />
                  <path d="M610 520 V 488 h70 V 520 Z M790 520 V 485 h50 V 520 Z" />
                  <rect x="712" y="440" width="4" height="8" fill="#ffd890" opacity=".6" />
                  {[[650, 495], [666, 500], [744, 470], [756, 488], [780, 470], [800, 500], [820, 498]].map(([x, y], i) => (
                    <rect key={i} className={`win w${i % 3}`} x={x} y={y} width="3" height="5" fill="#ffd27a" />
                  ))}
                  <path d="M714 404 V 384" stroke="#4a5565" strokeWidth="2" /><path className="banner" d="M714 384 l 16 4 l -16 5 Z" fill="#a8473a" />
                  <path d="M782 425 V 410" stroke="#4a5565" strokeWidth="2" /><path className="banner" d="M782 410 l 12 3 l -12 4 Z" fill="#a8473a" />
                  {/* a stone bridge over the gorge and the village at the castle's foot */}
                  <path d="M840 522 H 960 V 528 H 840 Z M852 528 q 14 -10 28 0 M892 528 q 14 -10 28 0 M932 528 q 14 -10 28 0" fill="#4a5565" stroke="#4a5565" strokeWidth="2" />
                  {[[566, 528], [590, 532], [960, 534], [988, 530], [1010, 536]].map(([x, y], i) => (
                    <path key={i} d={`M${x} ${y} v -10 l 8 -7 l 8 7 v 10 Z`} />
                  ))}
                </g>
                {/* chimney smoke drifting up from the village */}
                <g className="smoke" stroke="#c9c2cf" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".45">
                  {[574, 968, 996].map((x, i) => (
                    <path key={i} className={`puff p${i}`} d={`M${x} 520 q -8 -20 4 -38 q 12 -18 -2 -40 q -10 -16 6 -34`} />
                  ))}
                </g>
                {/* Epona grazing on the far hill (original silhouette); her head dips and lifts */}
                <g transform="translate(455 538) scale(.55)" fill="#5a3422">
                  <ellipse cx="0" cy="-30" rx="34" ry="15" />
                  <path d="M-26 -22 l -4 26 h 5 l 3 -22 M-14 -22 l -2 26 h 5 l 1 -24 M16 -22 l 2 26 h 5 l -2 -26 M26 -24 l 5 28 h 5 l -4 -30" />
                  <path d="M-34 -34 q -14 6 -12 26" stroke="#e9e2d0" strokeWidth="4" fill="none" />
                  <g className="epona-head">
                    <path d="M26 -40 q 12 -6 18 4 l 14 26 q 2 6 -4 7 l -8 -2 l -22 -22 Z" />
                    <path d="M28 -42 q 10 -8 16 -2" stroke="#e9e2d0" strokeWidth="5" fill="none" />
                  </g>
                </g>
                <g fill="#2a3a30" opacity=".85">
                  {range(30).map((i) => (
                    <path key={i} d={pine(-170 + i * 64 + ((i * 37) % 23), 566 + (i % 3) * 6, 70 + ((i * 53) % 60), 34 + ((i * 29) % 16))} />
                  ))}
                </g>
              </g>

              {/* low fog bank behind the clearing */}
              <g className="layer mid fog-back"><rect x="-500" y="470" width="2600" height="260" filter="url(#fog)" opacity=".55" /></g>

              {/* mid hills and the forest edge */}
              <g className="layer mid" filter="url(#dofMid)">
                <path d="M-200 650 Q 300 590 700 640 T 1500 620 T 1800 630 V 900 H -200 Z" fill="url(#hillMid)" />
              </g>
              <g className="layer mid trees" filter="url(#rough)">
                {/* tiered pines at both edges */}
                {[[70, 470, 150], [175, 520, 175], [1330, 470, 170], [1455, 440, 160], [1560, 400, 150], [1250, 330, 120]].map(([x, h, w], i) => (
                  <g key={i}>
                    <rect x={x - 6} y={730 - h * 0.25} width="12" height={h * 0.25} fill="#22170f" />
                    <path d={pine(x, 730, h, w)} fill="url(#treeG)" />
                    <path d={pine(x + w * 0.06, 730 - h * 0.08, h * 0.82, w * 0.55)} fill="#2e4a2c" opacity=".35" />
                  </g>
                ))}
                {/* the old oak the Hero sleeps under: trunk, bark, roots, leaf clusters, hanging vines */}
                <path d="M238 732 Q 250 600 254 470 Q 230 430 196 418 Q 236 424 258 448 Q 262 420 276 400 Q 272 430 284 452 Q 312 424 350 420 Q 312 436 292 470 Q 298 600 312 732 Q 290 722 276 732 Q 262 722 238 732 Z" fill="#2b1d13" />
                <path d="M262 720 q -4 -80 2 -160 M280 724 q 6 -90 0 -180 M270 640 q 8 -10 4 -26" stroke="#4a3322" strokeWidth="2.2" fill="none" />
                <path d="M238 732 q -30 -4 -46 8 M312 732 q 26 -6 44 6 M276 732 q 0 8 -6 14" stroke="#2b1d13" strokeWidth="9" strokeLinecap="round" fill="none" />
                {[[268, 380, 150, 105], [190, 430, 100, 74], [352, 418, 92, 68], [230, 345, 92, 70], [318, 350, 86, 64], [268, 300, 82, 56], [148, 470, 60, 44], [400, 462, 56, 40]].map(([cx, cy, rx, ry], i) => (
                  <g key={i}>
                    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#canopyG)" />
                    {range(5).map((j) => (
                      <ellipse key={j} cx={cx + ((j * 37) % rx) - rx / 2} cy={cy - ry / 3 + ((j * 23) % (ry / 1.5))} rx={rx / 4} ry={ry / 5} fill="#5a7d3c" opacity=".35" />
                    ))}
                  </g>
                ))}
                {[180, 214, 330, 372].map((x, i) => (
                  <path key={i} d={`M${x} ${452 + (i % 2) * 14} q ${i % 2 ? 6 : -6} 50 0 ${90 + i * 14}`} stroke="#3e6a36" strokeWidth="2.5" fill="none" opacity=".8" />
                ))}
                {/* moss on the trunk and a dark hollow */}
                <path d="M246 690 q 10 -20 6 -46 q 8 10 6 30 M300 700 q -6 -24 2 -44" stroke="#4d7a3e" strokeWidth="5" fill="none" opacity=".8" />
                <ellipse cx="276" cy="612" rx="9" ry="14" fill="#120b06" />
                <path d="M268 604 q 8 -8 16 0" stroke="#4a3322" strokeWidth="2" fill="none" />
              </g>

              {/* an owl dozing on the oak's low branch; it startles and flies off when the Hero wakes */}
              <g className="layer mid">
                <g className="owl" transform="translate(418 452)">
                  <path d="M-40 6 Q -10 0 30 8" stroke="#2b1d13" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <g className="owl-body">
                    <g className="owl-wing l"><path d="M-12 -22 q -26 -4 -34 14 q 18 -2 30 6 Z" fill="#5a4030" /></g>
                    <g className="owl-wing r"><path d="M12 -22 q 26 -4 34 14 q -18 -2 -30 6 Z" fill="#5a4030" /></g>
                    <ellipse cx="0" cy="-14" rx="14" ry="18" fill="#7a5a40" stroke="#3a2618" strokeWidth="1.5" />
                    <path d="M-8 -10 q 8 6 16 0 M-7 -4 q 7 5 14 0" stroke="#e8d8b8" strokeWidth="1.2" fill="none" />
                    <circle cx="0" cy="-28" r="11" fill="#7a5a40" stroke="#3a2618" strokeWidth="1.5" />
                    <path d="M-11 -36 l -3 -7 l 7 4 M11 -36 l 3 -7 l -7 4" fill="#5a4030" />
                    <ellipse cx="-4.5" cy="-29" rx="4.5" ry="4" fill="#efe2c0" /><ellipse cx="4.5" cy="-29" rx="4.5" ry="4" fill="#efe2c0" />
                    <path className="owl-eyes-shut" d="M-7 -29 h 5 M2 -29 h 5" stroke="#2b1d13" strokeWidth="1.5" />
                    <g className="owl-eyes-open"><circle cx="-4.5" cy="-29" r="2.2" fill="#f0b030" /><circle cx="4.5" cy="-29" r="2.2" fill="#f0b030" /></g>
                    <path d="M0 -26 l -2 4 h 4 Z" fill="#c9a040" />
                  </g>
                </g>
              </g>

              {/* the pedestal's holy light (behind the stone and the Hero) */}
              <g className="rays" filter="url(#rayBlur)" style={{ mixBlendMode: 'screen' }}>
                {range(11).map((i) => (
                  <polygon key={i} points="1010,560 975,-300 1045,-300" fill="url(#rayG)" transform={`rotate(${(i - 5) * 8} 1010 560)`} />
                ))}
              </g>
              <circle className="holy" cx="1010" cy="560" r="300" fill="url(#holy)" style={{ mixBlendMode: 'screen' }} />

              {/* the clearing: ground, grass, stage (the Hero and the stone) */}
              <g className="layer stage">
                <path d="M-200 700 Q 400 676 800 702 T 1800 688 V 1000 H -200 Z" fill="url(#groundG)" />
                <ellipse cx="1010" cy="712" rx="260" ry="34" fill="#ffe7a0" opacity=".12" />

                {/* a still pond in front of the clearing, reflecting the dawn sky */}
                <g className="pond">
                  <ellipse cx="610" cy="790" rx="170" ry="26" fill="#1f3020" />
                  <ellipse className="pond-sky" cx="610" cy="788" rx="160" ry="22" fill="url(#pondG)" opacity=".85" />
                  <ellipse cx="690" cy="784" rx="40" ry="6" fill="#fff0c0" opacity=".35" />
                  {range(5).map((i) => (
                    <path key={i} className={`shimmer s${i}`} d={`M${500 + i * 46} ${780 + (i % 3) * 5} h ${30 + (i % 2) * 18}`} stroke="#fff3d0" strokeWidth="1.6" opacity=".55" strokeLinecap="round" />
                  ))}
                  <ellipse className="ripple" cx="560" cy="790" rx="16" ry="3" fill="none" stroke="#fff3d0" strokeWidth="1.2" />
                  {[[520, 794, 14], [548, 799, 10], [700, 796, 12]].map(([x, y, r], i) => (
                    <g key={i}><ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill="#3f7a3a" /><path d={`M${x} ${y} l ${r} -${r * 0.1}`} stroke="#1f3020" strokeWidth="1.4" />{i === 0 && <circle cx={x - 4} cy={y - 3} r="3.5" fill="#f4c6d8" />}</g>
                  ))}
                  {range(9).map((i) => (
                    <path key={i} className="reed" d={`M${445 + i * 7 + (i > 4 ? 300 : 0)} 800 q ${i % 2 ? 4 : -3} -26 ${i % 2 ? 2 : -4} -${40 + (i % 3) * 12}`} stroke="#4d7a3e" strokeWidth="2.2" fill="none" />
                  ))}
                  <ellipse cx="471" cy="756" rx="3" ry="9" fill="#6b4423" /><ellipse cx="780" cy="752" rx="3" ry="9" fill="#6b4423" />
                </g>
                <g className="sway" fill="#5a8f45" opacity=".9">
                  {range(70).map((i) => (
                    <path key={i} d={`M${-180 + i * 28} ${706 + (i % 3) * 3} q 3 -${14 + (i % 5) * 4} ${(i % 2 ? 8 : -6)} -${22 + (i % 4) * 5} q -1 ${12 + (i % 3) * 3} 2 ${22 + (i % 4) * 5} Z`} />
                  ))}
                </g>

                {/* a worn path from the oak to the stone, and the ground's small things */}
                <path d="M300 724 Q 520 712 700 718 T 940 716" stroke="#8a7a50" strokeWidth="26" strokeLinecap="round" fill="none" opacity=".35" />
                <path d="M310 726 Q 520 716 700 721 T 940 719" stroke="#b9a670" strokeWidth="8" strokeLinecap="round" fill="none" opacity=".25" strokeDasharray="2 18" />
                {[[470, 726, 14], [610, 731, 9], [760, 724, 12], [1140, 728, 16], [1230, 734, 10], [880, 734, 7]].map(([x, y, r], i) => (
                  <g key={i}><ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill="#6f756e" /><ellipse cx={x - r * 0.25} cy={y - r * 0.2} rx={r * 0.5} ry={r * 0.25} fill="#a9b0a8" opacity=".7" /></g>
                ))}
                {range(46).map((i) => {
                  const x = -150 + ((i * 89) % 1900)
                  const y = 712 + ((i * 17) % 26)
                  const c = ['#f4f0e0', '#f3d35a', '#c9a0e8', '#f29ab0'][i % 4]
                  return (
                    <g key={i}>
                      <path d={`M${x} ${y} q 1 -8 0 -14`} stroke="#3e6a36" strokeWidth="1.5" fill="none" />
                      <circle cx={x} cy={y - 15} r={2.6} fill={c} /><circle cx={x} cy={y - 15} r={1} fill="#f3d35a" />
                    </g>
                  )
                })}
                {[[214, 734], [330, 736], [346, 730]].map(([x, y], i) => (
                  <g key={i}><rect x={x - 2} y={y - 12} width="4" height="12" fill="#efe6d0" /><path d={`M${x - 9} ${y - 11} q 9 -12 18 0 Z`} fill="#c0533a" /><circle cx={x - 3} cy={y - 15} r="1.4" fill="#fff" /><circle cx={x + 3} cy={y - 13} r="1.2" fill="#fff" /></g>
                ))}

                {/* ruins of an old temple ring the stone */}
                <g filter="url(#rough)">
                  <Pillar x={840} h={230} lean={-3} />
                  <Pillar x={1185} h={170} lean={4} />
                  <Pillar x={1290} h={96} />
                  <path d="M1220 734 l 40 -16 l 52 6 l 18 14 Z" fill="#7b837b" stroke="#2f3532" strokeWidth="2" />
                </g>

                {/* the sword in the stone (drawn before the stone so the stone hides the lower blade) */}
                <g className="sword" filter="url(#softGlow)">
                  <circle cx="1010" cy="518" r="7.5" fill="url(#goldG)" stroke="#6b4c0f" strokeWidth="2" />
                  <rect x="1004" y="524" width="12" height="32" rx="3" fill="#4b318a" stroke="#22163f" strokeWidth="2" />
                  <path d="M1004 530 L1016 534 M1004 538 L1016 542 M1004 546 L1016 550" stroke="#7a5cc0" strokeWidth="1.5" />
                  <path d="M966 556 Q 990 546 1010 558 Q 1030 546 1054 556 L 1047 569 Q 1030 562 1010 571 Q 990 562 973 569 Z" fill="url(#goldG)" stroke="#6b4c0f" strokeWidth="2" />
                  <path d="M1010 556 l5 7 l-5 7 l-5 -7 Z" fill="#3f8fd9" stroke="#123a5a" strokeWidth="1" />
                  <path d="M1001 571 H 1019 L 1019 688 L 1010 704 L 1001 688 Z" fill="url(#bladeG)" stroke="#4d6676" strokeWidth="1.6" />
                  <path d="M1010 575 V 692" stroke="#ffffff" strokeWidth="1.4" opacity=".8" />
                  <path d="M1008 592 V 684 M1012 592 V 684" stroke="#8fa6b4" strokeWidth=".6" opacity=".7" />
                  <path d="M1010 576 l3.2 5.5 h-6.4 Z M1006.8 581.5 l3.2 5.5 h-6.4 Z M1013.2 581.5 l3.2 5.5 h-6.4 Z" fill="#d8b456" opacity=".85" transform="translate(-3.2 0)" />
                  <path className="shine" d="M1003 600 L 1017 590 L 1017 596 L 1003 606 Z" fill="#ffffff" opacity=".0" />
                  <circle className="glint" cx="1012" cy="600" r="5" fill="#fff" />
                </g>

                {/* weathered stone pedestal */}
                <g filter="url(#rough)">
                  <path d="M928 722 L 948 650 H 1072 L 1092 722 Z" fill="url(#stoneG)" stroke="#2f3532" strokeWidth="3" />
                  <path d="M948 650 L 964 630 H 1056 L 1072 650 Z" fill="#c7cdc6" stroke="#2f3532" strokeWidth="3" />
                  <path d="M960 676 q 30 -6 54 4 M1030 702 q 22 -8 46 0" stroke="#3a403c" strokeWidth="2" fill="none" opacity=".6" />
                  <path d="M995 692 L1010 666 L1025 692 Z M980 716 L995 692 L1010 716 Z M1010 716 L1025 692 L1040 716 Z" fill="#d8b456" opacity=".6" />
                  <path d="M934 704 q 22 -10 44 0 q 10 -6 18 2 M1036 700 q 22 -10 44 2" stroke="#3e6a36" strokeWidth="5" fill="none" />
                  <path d="M952 716 l 8 -20 l -4 -14 M1060 718 l -6 -16 l 6 -12 M1000 650 l 6 10 l -2 10" stroke="#2f3532" strokeWidth="1.6" fill="none" opacity=".7" />
                  <path d="M944 660 q 20 18 8 40 q 14 10 4 26 M1078 668 q -16 16 -6 34 q -12 12 -2 20" stroke="#2f5a2f" strokeWidth="2.5" fill="none" />
                  {range(10).map((i) => <ellipse key={i} cx={i < 5 ? 948 + (i % 2) * 6 : 1072 - (i % 2) * 6} cy={666 + (i % 5) * 12} rx="5" ry="3" fill="#4d8a3a" />)}
                  <ellipse cx="986" cy="633" rx="12" ry="3" fill="#5a8f45" opacity=".8" />
                  <ellipse cx="1046" cy="634" rx="9" ry="2.5" fill="#5a8f45" opacity=".8" />
                  <path d="M912 728 H 1108 L 1100 740 H 920 Z" fill="#6b736c" stroke="#2f3532" strokeWidth="2" />
                </g>

                {/* runes carved in the pedestal wake one by one as the Hero comes near */}
                <g className="runes">
                  {[[962, 700], [984, 712], [1036, 712], [1058, 700], [1010, 642]].map(([x, y], i) => (
                    <g key={i} className={`rune r${i}`}>
                      <circle cx={x} cy={y} r="16" fill="url(#runeGlow)" opacity=".8" />
                      <path d={i % 2 ? `M${x - 5} ${y - 6} L${x + 5} ${y + 6} M${x + 5} ${y - 6} L${x} ${y} M${x - 5} ${y + 6} h 4` : `M${x} ${y - 7} V ${y + 7} M${x - 5} ${y - 3} L${x} ${y} L${x + 5} ${y - 3}`} stroke="#bffcf2" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </g>
                  ))}
                </g>
                {/* a shaft of dawn light falls on the stone */}
                <polygon className="stone-shaft" points="1060,-60 1180,-60 1060,720 960,720" fill="url(#rayG)" opacity=".0" style={{ mixBlendMode: 'screen' }} filter="url(#rayBlur)" />

                {/* the Hero (original drawing: green tunic, long cap), feet at local 0,0, facing right */}
                <g transform="translate(360 720) scale(1.3)">
                  <g className="hero-walk">
                    <ellipse cx="2" cy="1" rx="40" ry="7" fill="url(#shadowG)" />
                    <g className="hero-wake" filter="url(#rim)">
                      <g className="leg back"><rect x="-13" y="-58" width="11" height="44" fill="#c9b78a" /><rect x="-16" y="-18" width="17" height="18" rx="3" fill="#5a381c" /><rect x="-17" y="-21" width="19" height="5" rx="2" fill="#6b4423" /></g>
                      <circle cx="-26" cy="-98" r="20" fill="url(#shieldG)" stroke="#101f45" strokeWidth="3" />
                      <circle cx="-26" cy="-98" r="14" fill="none" stroke="#9fb5e0" strokeWidth="1.2" opacity=".6" />
                      <path d="M-34 -104 L-26 -116 L-18 -104 Z" fill="#d8b456" />
                      <path d="M-30 -92 q 4 -6 8 0 q 4 -6 8 0" stroke="#c0392b" strokeWidth="2.2" fill="none" />
                      <circle cx="-26" cy="-98" r="20" fill="none" stroke="#b8c0c8" strokeWidth="2" strokeDasharray="2 5" />
                      <path d="M-22 -130 L 24 -130 L 32 -55 L -30 -55 Z" fill="url(#tunicG)" stroke="#173d16" strokeWidth="2.5" />
                      <path d="M-14 -126 L -18 -60 M6 -126 L 8 -60" stroke="#1d4a1c" strokeWidth="1.6" opacity=".55" />
                      <path d="M-8 -130 L 4 -112 L 14 -130" fill="#e6ddc0" stroke="#8a7d5a" strokeWidth="1" />
                      <path d="M-30 -55 L 32 -55 L 30 -50 L -28 -50 Z" fill="#9aa2a8" stroke="#5d656b" strokeWidth="1" />
                      <path d="M-26 -53 h 54" stroke="#5d656b" strokeWidth="1" strokeDasharray="2 2" />
                      <rect x="-27" y="-92" width="56" height="9" fill="#5a381c" />
                      <path d="M-25 -88 h 52" stroke="#7a5230" strokeWidth="1" strokeDasharray="3 3" />
                      <rect x="-2" y="-93" width="11" height="11" rx="2" fill="url(#goldG)" />
                      <path d="M14 -84 h 12 v 13 q -6 4 -12 0 Z" fill="#7a4e28" stroke="#3d2412" strokeWidth="1.2" />
                      <path d="M14 -80 h 12" stroke="#3d2412" strokeWidth="1" />
                      <g className="leg front"><rect x="1" y="-58" width="11" height="44" fill="#e6d6a8" /><path d="M3 -50 l 7 4 M3 -40 l 7 4 M3 -30 l 7 4" stroke="#bfae80" strokeWidth="1" /><rect x="-1" y="-18" width="19" height="18" rx="3" fill="#6b4423" /><rect x="-2" y="-21" width="21" height="5" rx="2" fill="#8a5a30" stroke="#3d2412" strokeWidth="1" /><path d="M2 -6 h 14" stroke="#3d2412" strokeWidth="1.4" /></g>
                      <g className="head">
                        <circle cx="4" cy="-150" r="19" fill="url(#skinG)" stroke="#9a6a44" strokeWidth="1.8" />
                        <path d="M20 -152 L 35 -161 L 22 -146 Z" fill="url(#skinG)" stroke="#9a6a44" strokeWidth="1.4" />
                        <path d="M-15 -158 Q 2 -178 23 -160 L 17 -149 Q 8 -160 -12 -148 Z" fill="url(#hairG)" />
                        <path d="M14 -158 q 4 8 2 16 M8 -160 q 2 8 -1 14" stroke="#c99a30" strokeWidth="1.4" fill="none" />
                        <path d="M-17 -160 Q 4 -192 23 -164 Q 0 -168 -20 -150 Q -46 -138 -66 -116 Q -42 -152 -17 -160 Z" fill="url(#capG)" stroke="#173d16" strokeWidth="2.2" />
                        <path className="eye-closed" d="M8 -150 q 5 3 9 0" stroke="#3b2414" strokeWidth="2.5" fill="none" />
                        <g className="eye-open"><ellipse cx="13" cy="-151" rx="3" ry="4" fill="#fff" /><circle cx="14" cy="-151" r="2.2" fill="#1f5fa8" /><circle cx="14.8" cy="-152.2" r=".8" fill="#fff" /></g>
                        <path d="M16 -142 q 3 1 5 -1" stroke="#9a6a44" strokeWidth="1.2" fill="none" />
                        <path d="M8 -158 q 5 -3 10 -1" stroke="#b88a2a" strokeWidth="1.8" fill="none" />
                        <path d="M20 -148 l 3 3 l -3 1" stroke="#9a6a44" strokeWidth="1.2" fill="none" />
                        <circle cx="25" cy="-146" r="2.2" fill="#3f8fd9" stroke="#123a5a" strokeWidth=".8" />
                        <path d="M-6 -162 q 6 10 3 20 M0 -164 q 4 8 3 14 M-12 -158 q 2 8 -2 14" stroke="#e0b440" strokeWidth="1.3" fill="none" />
                        <path d="M-17 -160 Q 2 -172 23 -162" stroke="#173d16" strokeWidth="2.4" fill="none" />
                        <g className="cap-tail"><path d="M-62 -120 q -10 6 -14 16 q 8 -4 16 -10 Z" fill="url(#capG)" stroke="#173d16" strokeWidth="1.6" /></g>
                        <path d="M-20 -150 q -24 12 -40 30" stroke="#2e6a2a" strokeWidth="1.2" fill="none" opacity=".7" />
                      </g>
                      <g className="arm">
                        <rect x="12" y="-126" width="11" height="30" rx="5" fill="url(#tunicG)" stroke="#173d16" strokeWidth="2" />
                        <rect x="13" y="-98" width="9" height="12" fill="#9aa2a8" stroke="#5d656b" strokeWidth="1" />
                        <path d="M13 -94 h 9 M13 -90 h 9" stroke="#5d656b" strokeWidth=".8" />
                        <rect x="11.5" y="-87" width="12" height="9" rx="2" fill="#7a4e28" stroke="#3d2412" strokeWidth="1.2" />
                        <circle cx="17.5" cy="-75" r="6.5" fill="#8a5a30" stroke="#3d2412" strokeWidth="1.4" />
                      </g>
                    </g>
                  </g>
                </g>
              </g>

              {/* fog drifting across the clearing, in front of the stage */}
              <g className="layer stage fog-front"><rect x="-500" y="600" width="2600" height="200" filter="url(#fog)" opacity=".32" /></g>

              {/* sleep Zs and the waking "!" */}
              <g className="zzz" fill="#f4fffc" fontFamily="Georgia, serif" fontWeight="700" filter="url(#softGlow)">
                <text x="190" y="650" fontSize="34" className="z1">z</text>
                <text x="222" y="612" fontSize="44" className="z2">Z</text>
                <text x="262" y="566" fontSize="54" className="z3">Z</text>
              </g>
              <text className="bang" x="375" y="455" fontSize="86" fontWeight="900" fill="#ffe14a" stroke="#7a4a00" strokeWidth="4" fontFamily="Georgia, serif" filter="url(#softGlow)">!</text>

              {/* out-of-focus foreground: ferns and grass right in front of the lens */}
              <g className="layer near" filter="url(#dofNear)">
                <path d="M-80 920 Q 40 700 120 640 Q 80 760 160 700 Q 110 820 230 760 Q 160 880 300 920 Z" fill="#0d2414" />
                <path d="M1700 920 Q 1560 690 1480 650 Q 1520 760 1430 712 Q 1480 830 1360 780 Q 1440 880 1290 920 Z" fill="#0d2414" />
                <path d="M600 930 q 30 -110 60 -150 q -10 80 30 150 Z M760 930 q 20 -90 70 -130 q -20 70 10 130 Z" fill="#112d19" opacity=".9" />
              </g>
            </g>
          </svg>

          <div className="post nightgrade" />
          {/* the Twilight portal sits above the night grade so it glows through the dark */}
          <svg className="scene portal-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <defs><radialGradient id="portalG2" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#5af0dc" stopOpacity=".4" /><stop offset=".45" stopColor="#0b3a38" stopOpacity=".5" /><stop offset=".8" stopColor="#020405" stopOpacity=".55" /><stop offset="1" stopColor="#020405" stopOpacity="0" /></radialGradient>
              <filter id="portalGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
            <g filter="url(#portalGlow)">
                {/* the Twilight portal hanging in the night sky, which closes as dawn comes */}
                <g transform="translate(860 190)"><g className="tw-portal">
                  <circle r="150" fill="url(#portalG2)" />
                  <g className="tw-ring1"><circle r="118" fill="none" stroke="#36d3c0" strokeWidth="2.5" strokeDasharray="14 9 3 9" opacity=".8" /></g>
                  <g className="tw-ring2"><circle r="84" fill="none" stroke="#e86a2c" strokeWidth="2" strokeDasharray="4 12" opacity=".75" /></g>
                  <g className="tw-ring1">
                    {range(12).map((i) => (
                      <rect key={i} x="-5" y="-104" width="10" height="10" fill="#020405" stroke="#5af0dc" strokeWidth="1.2" transform={`rotate(${i * 30}) rotate(45 0 -99)`} />
                    ))}
                  </g>
                  <path d="M0 -40 L 34 20 H -34 Z" fill="none" stroke="#5af0dc" strokeWidth="2" opacity=".6" />
                </g></g>
            </g>
          </svg>
          <IntroMotes />
          <div className="post bloom" />
          <div className="post flare"><i /><i /><i /><i /></div>
          <div className="post vignette" />
          <div className="post grain" />

          <div className="caption c1">Ordon Woods · first light</div>
          <div className="caption c2">The blade that wakes the Twilight Desk…</div>
          <div className="flash" />
          <div className="final-title">
            <Triforce size={64} />
            <h1>CAMPUS CUSTOMS</h1>
            <h2>Twilight Desk</h2>
          </div>
          <div className="letterbox top" />
          <div className="letterbox bottom" />
        </>
      )}
    </div>
  )
}
