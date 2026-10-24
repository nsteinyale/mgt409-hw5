import { useEffect, useRef, useState } from 'react'
import { Rupee } from './Art'

/** The checking balance as a rupee wallet. It counts down, and shows the drop, after an approved payment. */
export function Wallet({ balance, date }: { balance: number | null; date?: string }) {
  const [shown, setShown] = useState(balance ?? 0)
  const [delta, setDelta] = useState<number | null>(null)
  const prev = useRef<number | null>(null)

  useEffect(() => {
    if (balance == null) return
    const from = prev.current ?? balance
    prev.current = balance
    if (from === balance) { setShown(balance); return }
    setDelta(balance - from)
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1200)
      setShown(from + (balance - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // background tabs pause animation frames: always land on the real balance
    const settle = setTimeout(() => setShown(balance), 1300)
    const clear = setTimeout(() => setDelta(null), 3200)
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); clearTimeout(clear) }
  }, [balance])

  return (
    <div className="wallet" title={`checking balance${date ? ` as of ${date}` : ''}`}>
      <Rupee size={30} className="wallet-rupee" />
      <div>
        <div className="wallet-label">Checking</div>
        <div className="wallet-amt">{balance == null ? '…' : `$${shown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
      </div>
      {delta != null && <span className={`wallet-delta ${delta < 0 ? 'down' : 'up'}`}>{delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}</span>}
    </div>
  )
}
