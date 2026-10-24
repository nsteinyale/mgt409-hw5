import { useEffect, useRef } from 'react'

/* Canvas particles for the intro, drawn every frame:
   - Twilight squares: black shards with a teal edge that rise and dissolve as dawn breaks (first ~3.5 s)
   - dust motes: warm specks drifting through the light, brighter near the sun and the sword
   - fireflies: soft green-gold glows that pulse
   - bokeh: big, blurry out-of-focus discs close to the "camera" for depth
   The canvas uses the same 1600x900 frame as the SVG scene (letterboxed to fit). */

type Kind = 'shard' | 'dust' | 'fly' | 'bokeh' | 'leaf' | 'butterfly' | 'dew'
interface P { k: Kind; x: number; y: number; vx: number; vy: number; s: number; a: number; ph: number; rot: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function make(): P[] {
  const out: P[] = []
  for (let i = 0; i < 70; i++) out.push({ k: 'shard', x: rnd(0, 1600), y: rnd(80, 900), vx: rnd(-8, 8), vy: rnd(-40, -16), s: rnd(6, 22), a: rnd(.5, 1), ph: rnd(0, 6), rot: rnd(0, 6) })
  for (let i = 0; i < 140; i++) out.push({ k: 'dust', x: rnd(0, 1600), y: rnd(200, 820), vx: rnd(-6, 10), vy: rnd(-10, -2), s: rnd(.8, 2.4), a: rnd(.3, .9), ph: rnd(0, 6), rot: 0 })
  for (let i = 0; i < 22; i++) out.push({ k: 'fly', x: rnd(60, 1540), y: rnd(470, 760), vx: rnd(-12, 12), vy: rnd(-8, 8), s: rnd(2, 3.5), a: 1, ph: rnd(0, 6), rot: 0 })
  for (let i = 0; i < 26; i++) out.push({ k: 'leaf', x: rnd(-100, 1700), y: rnd(-200, 700), vx: rnd(10, 40), vy: rnd(18, 40), s: rnd(5, 10), a: rnd(.7, 1), ph: rnd(0, 6), rot: rnd(0, 6) })
  for (let i = 0; i < 4; i++) out.push({ k: 'butterfly', x: rnd(420, 1250), y: rnd(640, 720), vx: rnd(-20, 20), vy: 0, s: rnd(6, 9), a: 1, ph: rnd(0, 6), rot: i })
  for (let i = 0; i < 40; i++) out.push({ k: 'dew', x: rnd(-150, 1750), y: rnd(708, 740), vx: 0, vy: 0, s: rnd(1, 2.2), a: 1, ph: rnd(0, 6), rot: 0 })
  for (let i = 0; i < 9; i++) out.push({ k: 'bokeh', x: rnd(0, 1600), y: rnd(0, 900), vx: rnd(-5, 5), vy: rnd(-6, -1), s: rnd(40, 110), a: rnd(.05, .14), ph: rnd(0, 6), rot: 0 })
  return out
}

export function IntroMotes() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const parts = make()
    const t0 = performance.now()
    let last = t0
    let raf = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (now: number) => {
      const t = (now - t0) / 1000
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // fit the 1600x900 frame like preserveAspectRatio="xMidYMid meet"
      const k = Math.min(cv.width / 1600, cv.height / 900)
      const ox = (cv.width - 1600 * k) / 2
      const oy = (cv.height - 900 * k) / 2
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.setTransform(k, 0, 0, k, ox, oy)

      const dawn = Math.min(1, Math.max(0, (t - 0.3) / 3)) // 0 = Twilight, 1 = full dawn
      const burst = t > 7.7 ? Math.max(0, 1 - (t - 7.7) / 2.5) : 0 // light burst at the pull

      for (const p of parts) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.ph += dt
        if (p.k === 'shard') {
          // Twilight lifts: shards speed up and fade out as the sun comes up
          p.vy -= dt * 14 * dawn
          const life = (1 - dawn) * p.a
          if (life <= 0.01) continue
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot + p.ph * 0.6)
          ctx.globalAlpha = life
          ctx.shadowColor = 'rgba(64,235,215,.9)'
          ctx.shadowBlur = 14
          ctx.fillStyle = '#020405'
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s)
          ctx.strokeStyle = 'rgba(90,245,225,.95)'
          ctx.lineWidth = 2
          ctx.strokeRect(-p.s / 2, -p.s / 2, p.s, p.s)
          ctx.fillStyle = 'rgba(54,211,192,.35)'
          ctx.fillRect(-p.s / 6, -p.s / 6, p.s / 3, p.s / 3)
          ctx.restore()
          continue
        }
        if (p.k === 'leaf') {
          // falling, tumbling leaves; the gust at the pull throws them up and outward from the sword
          if (burst > 0) { const dx = p.x - 1000; p.vx += Math.sign(dx || 1) * burst * dt * 160; p.vy -= burst * dt * 220 }
          p.vx += (22 - p.vx) * dt * 0.5
          p.vy += (30 - p.vy) * dt * 0.5
          if (p.y > 900) { p.y = -40; p.x = rnd(-100, 1500) }
          if (p.x > 1720) { p.x = -60 }
          ctx.save()
          ctx.translate(p.x + Math.sin(p.ph * 1.7) * 16, p.y)
          ctx.rotate(p.rot + p.ph * 2.1)
          ctx.scale(1, Math.abs(Math.cos(p.ph * 2.6)) * 0.8 + 0.2)
          ctx.globalAlpha = p.a * (0.35 + 0.65 * dawn)
          ctx.fillStyle = ['#8fae3a', '#c9a23a', '#6b8f2c', '#d97a3a'][Math.floor(p.s) % 4]
          ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(40,50,20,.5)'; ctx.lineWidth = 0.8
          ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.lineTo(p.s, 0); ctx.stroke()
          ctx.restore()
          continue
        }
        if (p.k === 'butterfly') {
          // they wake with the sun and flutter over the flowers
          if (dawn < 0.6) continue
          p.x += Math.sin(p.ph * 0.9 + p.rot) * dt * 40
          p.y = 690 + Math.sin(p.ph * 1.3 + p.rot) * 28 - (burst * 60)
          const flap = Math.abs(Math.sin(p.ph * 14))
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.globalAlpha = Math.min(1, (dawn - 0.6) * 3)
          ctx.fillStyle = ['#f3d35a', '#f4f0e0', '#9fd0ff', '#f29ab0'][p.rot % 4]
          ctx.beginPath(); ctx.ellipse(-p.s * 0.6 * flap, 0, p.s * flap + 1, p.s * 0.8, -0.4, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.ellipse(p.s * 0.6 * flap, 0, p.s * flap + 1, p.s * 0.8, 0.4, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#2a2030'; ctx.fillRect(-1, -p.s * 0.7, 2, p.s * 1.4)
          ctx.restore()
          continue
        }
        if (p.k === 'dew') {
          // dew catching the first light on the grass
          const tw = Math.max(0, Math.sin(p.ph * 3 + p.x))
          if (dawn < 0.3 || tw < 0.75) continue
          ctx.globalAlpha = (tw - 0.75) * 4 * dawn
          ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(p.x - p.s * 3, p.y); ctx.lineTo(p.x + p.s * 3, p.y); ctx.moveTo(p.x, p.y - p.s * 3); ctx.lineTo(p.x, p.y + p.s * 3); ctx.stroke()
          continue
        }
        if (p.y < -120) { p.y = 920; p.x = rnd(0, 1600) }
        if (p.x < -120) p.x = 1720
        if (p.x > 1720) p.x = -120

        if (p.k === 'dust') {
          // brighter inside the sun's light and the sword's shaft
          const nearSun = Math.max(0, 1 - Math.hypot(p.x - 1180, p.y - 600) / 700)
          const nearSword = Math.max(0, 1 - Math.abs(p.x - 1000) / 260) * (t > 6.6 ? 1 : 0)
          const glow = (0.15 + 0.85 * Math.max(nearSun, nearSword) + burst) * dawn
          ctx.globalAlpha = Math.min(1, p.a * glow * (0.6 + 0.4 * Math.sin(p.ph * 2)))
          ctx.fillStyle = '#fff1c9'
          ctx.beginPath(); ctx.arc(p.x + Math.sin(p.ph) * 4, p.y, p.s, 0, Math.PI * 2); ctx.fill()
        } else if (p.k === 'fly') {
          p.vx += Math.sin(p.ph * 1.3) * dt * 6
          p.vy += Math.cos(p.ph * 1.1) * dt * 6
          const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(p.ph * 2.2))
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 6)
          g.addColorStop(0, `rgba(236,255,170,${0.9 * pulse})`)
          g.addColorStop(1, 'rgba(236,255,170,0)')
          ctx.globalAlpha = 1 - dawn * 0.5
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 6, 0, Math.PI * 2); ctx.fill()
        } else {
          const g = ctx.createRadialGradient(p.x, p.y, p.s * 0.2, p.x, p.y, p.s)
          g.addColorStop(0, 'rgba(255,230,180,.9)')
          g.addColorStop(0.7, 'rgba(255,220,170,.35)')
          g.addColorStop(1, 'rgba(255,220,170,0)')
          ctx.globalAlpha = p.a * (0.4 + dawn * 0.6 + burst)
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="motes" aria-hidden />
}
