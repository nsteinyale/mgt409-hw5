import { useState } from 'react'
import type { Approval, Run } from '../types'
import { Rupee, Triforce } from './Art'

const KIND_LABEL: Record<Approval['kind'], string> = {
  payment: 'Payment',
  purchase: 'Purchase',
  discount: 'Discount',
  customer_message: 'Customer message',
  verify: 'Verify',
  other: 'Decision',
}

/** Items only a person can sign. Payments and purchases move real cash when approved. */
export function Approvals({
  run, approver, setApprover, onDecide, busyIndex,
}: {
  run: Run
  approver: string
  setApprover: (v: string) => void
  onDecide: (index: number, decision: 'approve' | 'decline') => void
  busyIndex: number | null
}) {
  const [confirming, setConfirming] = useState<number | null>(null)
  const pending = run.approvals.filter((a) => a.status === 'pending').length
  if (run.status !== 'done') return null

  return (
    <section className="panel seals">
      <h2>
        Seals for your hand
        <span className="muted"> · {run.approvals.length === 0 ? 'nothing to approve' : pending ? `${pending} waiting` : 'all signed'}</span>
      </h2>
      {run.approvals.length === 0 && <p className="empty">The party needed no approval. The quest closed itself.</p>}
      {run.approvals.length > 0 && (
        <label className="approver">
          Signing as
          <input value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="your name" />
        </label>
      )}
      <ul>
        {run.approvals.map((a) => {
          const money = a.kind === 'payment' || a.kind === 'purchase'
          const busy = busyIndex === a.index
          return (
            <li key={a.index} className={`seal ${a.status} ${money ? 'money' : ''}`}>
              <div className="seal-kind">
                {money ? <Rupee size={20} /> : <Triforce size={18} />}
                <span>{KIND_LABEL[a.kind]}</span>
                {a.amount != null && <b className="amt">${a.amount.toFixed(2)}</b>}
              </div>
              <p>{a.description}</p>
              {a.status === 'pending' ? (
                <div className="seal-actions">
                  {confirming === a.index && money ? (
                    <>
                      <span className="warn">Pay ${a.amount?.toFixed(2) ?? ''} from checking?</span>
                      <button className="btn gold" disabled={!approver.trim() || busy} onClick={() => { setConfirming(null); onDecide(a.index, 'approve') }}>
                        {busy ? 'Paying…' : 'Yes, pay it'}
                      </button>
                      <button className="btn ghost" onClick={() => setConfirming(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn gold"
                        disabled={!approver.trim() || busy}
                        title={approver.trim() ? '' : 'Type your name first'}
                        onClick={() => (money ? setConfirming(a.index) : onDecide(a.index, 'approve'))}
                      >
                        {busy ? '…' : money ? 'Approve payment' : 'Approve'}
                      </button>
                      <button className="btn ghost" disabled={!approver.trim() || busy} onClick={() => onDecide(a.index, 'decline')}>Decline</button>
                    </>
                  )}
                </div>
              ) : (
                <div className={`seal-done ${a.status}`}>
                  {a.status === 'approved' ? '✓ Approved' : '✕ Declined'} by {a.decided_by}
                  {a.payment && <> · paid ${a.payment.amount.toFixed(2)}</>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
