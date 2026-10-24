/** Twilight pinball sounds, synthesized with Web Audio (no audio files).
 *
 *  arrow   a delegation flies out (bowstring twang + whoosh)
 *  octorok an answer comes back (Octorok "ploop" bounce)
 *  tick    an agent uses a tool (soft rune pluck)
 *  chime   the Boss finishes the quest (an original four-note ocarina motif)
 *  growl   a guardrail stops something (Ganondorf)
 *  rupee   a human approves a payment
 *
 *  Same idea as the Lecture 10 pinball: a tiny scheduler spaces bursts out so a cascade of
 *  events sounds like bumper hits, not one smeared chord. play() returns the delay in ms.
 */

export type Sfx = 'arrow' | 'octorok' | 'tick' | 'chime' | 'growl' | 'rupee'

const GAP: Record<Sfx, number> = { arrow: 0.1, octorok: 0.12, tick: 0.05, chime: 0.4, growl: 0.3, rupee: 0.2 }
const MAX_BACKLOG = 1.6

let ctx: AudioContext | null = null
let muted = localStorage.getItem('twilight-muted') === '1'
let nextAt = 0

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  localStorage.setItem('twilight-muted', m ? '1' : '0')
}

function getCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(c: AudioContext, at: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number, vibrato = 0) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, at)
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, at + dur)
  if (vibrato) {
    const lfo = c.createOscillator()
    const lg = c.createGain()
    lfo.frequency.value = 5.5
    lg.gain.value = vibrato
    lfo.connect(lg).connect(osc.frequency)
    lfo.start(at)
    lfo.stop(at + dur + 0.05)
  }
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

function noise(c: AudioContext, at: number, dur: number, gain: number, from: number, to: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(from, at)
  f.frequency.exponentialRampToValueAtTime(to, at + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(at)
  src.stop(at + dur)
}

function render(c: AudioContext, s: Sfx, at: number, pitch: number) {
  if (s === 'arrow') {
    tone(c, at, 'triangle', 330 * pitch, 150 * pitch, 0.18, 0.08) // bowstring
    noise(c, at + 0.02, 0.28, 0.05, 900, 4200) // whoosh
  } else if (s === 'octorok') {
    tone(c, at, 'sine', 420 * pitch, 140 * pitch, 0.16, 0.12)
    tone(c, at + 0.13, 'sine', 300 * pitch, 120 * pitch, 0.12, 0.07)
  } else if (s === 'tick') {
    tone(c, at, 'sine', 1400 * pitch, 1100 * pitch, 0.09, 0.035)
  } else if (s === 'chime') {
    ;[587.3, 698.5, 880, 783.99].forEach((f, i) => tone(c, at + i * 0.22, 'sine', f, f, 0.5, 0.07, 4))
  } else if (s === 'growl') {
    tone(c, at, 'sawtooth', 90, 55, 0.6, 0.06)
    tone(c, at, 'square', 62, 40, 0.6, 0.03)
  } else {
    ;[1568, 2093].forEach((f, i) => tone(c, at + i * 0.07, 'triangle', f, f, 0.22, 0.05))
  }
}

export function play(s: Sfx, pitch = 1): number {
  const c = getCtx()
  if (!c) return 0
  const now = c.currentTime + 0.01
  const at = Math.max(now, nextAt)
  if (at - now > MAX_BACKLOG) return 0
  nextAt = at + GAP[s]
  if (!muted) {
    try { render(c, s, at, pitch) } catch { /* AudioContext quirks */ }
  }
  return Math.round((at - now) * 1000)
}

/** The intro cinematic's score, scheduled against the same clock as the animation (seconds from start).
 *  All original: a soft dawn pad, the "!" when the Hero wakes, footsteps, the pull, the shing, a fanfare. */
export function playIntro(): void {
  const c = getCtx()
  if (!c || muted) return
  const t0 = c.currentTime + 0.05
  try {
    // dawn pad
    ;[146.83, 220, 293.66].forEach((f) => tone(c, t0, 'sine', f, f, 3.2, 0.025, 2))
    tone(c, t0 + 1.4, 'sine', 349.23, 349.23, 1.8, 0.018, 3)
    // waking "!"
    tone(c, t0 + 3.0, 'triangle', 1318.5, 1318.5, 0.18, 0.06)
    tone(c, t0 + 3.09, 'triangle', 1760, 1760, 0.25, 0.06)
    // footsteps to the pedestal
    for (let s = 3.95; s < 6.1; s += 0.36) noise(c, t0 + s, 0.07, 0.05, 500, 200)
    // the pull: a rising strain, then the shing
    tone(c, t0 + 6.6, 'sawtooth', 110, 440, 1.2, 0.025)
    noise(c, t0 + 6.6, 1.2, 0.03, 300, 3000)
    tone(c, t0 + 7.8, 'triangle', 2637, 3136, 0.6, 0.06)
    noise(c, t0 + 7.8, 0.5, 0.06, 5000, 9000)
    // fanfare (original arpeggio)
    ;[587.33, 739.99, 880, 1174.66].forEach((f, i) => tone(c, t0 + 7.95 + i * 0.13, 'triangle', f, f, 0.9 - i * 0.1, 0.05, 3))
    // zoom whoosh and the big chord on the white flash
    noise(c, t0 + 8.2, 1.4, 0.04, 400, 7000)
    ;[293.66, 369.99, 440, 587.33, 880].forEach((f) => tone(c, t0 + 9.5, 'sine', f, f, 2.2, 0.035, 3))
  } catch { /* AudioContext quirks */ }
}

/** Each agent gets its own pitch, so you can hear who's talking. */
export const PITCH: Record<string, number> = { Boss: 1, Inventory: 0.8, Accounting: 1.15, Facilities: 0.9, CustomerService: 1.3 }
