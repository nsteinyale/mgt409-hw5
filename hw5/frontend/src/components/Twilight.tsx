import { useMemo } from 'react'

/** Black-and-teal squares drifting upward, like the Twilight Realm. Pure CSS, no images. */
export function TwilightSky() {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: Math.random() * 100,
        size: 4 + Math.random() * 10,
        delay: -Math.random() * 18,
        dur: 12 + Math.random() * 14,
        teal: i % 4 === 0,
      })),
    [],
  )
  return (
    <div className="sky" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className={b.teal ? 'bit teal' : 'bit'}
          style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}
        />
      ))}
    </div>
  )
}
