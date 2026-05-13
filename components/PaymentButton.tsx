'use client'
/**
 * PaymentButton — the "Settle Salary" CTA.
 *
 * Flow:
 *  1. User taps button → we POST a `payments` row (status: 'initiated').
 *  2. Mobile  → window.location = upi://pay?…  (native UPI app opens)
 *     Desktop → modal with a scannable QR + UTR confirm input
 *  3. After paying, the user pastes the UTR back into the modal and
 *     we flip the payments row to 'completed'. (Mobile users go
 *     through the engagement detail page for the UTR step.)
 *
 * No external dependencies — the QR image is rendered via
 * api.qrserver.com so we don't need a QR library in the bundle.
 */
import { useState, useTransition } from 'react'
import { Wallet, Loader2, X, CheckCircle2, Copy } from 'lucide-react'
import { buildUpiIntent, generateTxnRef } from '@/lib/upi'
import { createClient } from '@/lib/supabase/client'

interface Props {
  engagementId: string
  amount: number              // ₹
  daysWorked: number
  periodStart: string         // YYYY-MM-DD
  periodEnd: string           // YYYY-MM-DD
  workerName: string
}

const NODAL_VPA   = process.env.NEXT_PUBLIC_NODAL_VPA   ?? 'samarth@upi'
const PAYEE_NAME  = process.env.NEXT_PUBLIC_NODAL_PAYEE_NAME ?? 'SocietyHelp'

export default function PaymentButton({
  engagementId, amount, daysWorked, periodStart, periodEnd, workerName,
}: Props) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  // QR modal state — only used on desktop.
  const [qr, setQr] = useState<null | { uri: string; txnRef: string }>(null)

  const onSettle = () => {
    setErr(null)
    start(async () => {
      const supabase = createClient()
      const txnRef = generateTxnRef()

      // 1. Record an "initiated" payment.
      const { error } = await supabase.from('payments').insert({
        engagement_id: engagementId,
        amount,
        period_start: periodStart,
        period_end: periodEnd,
        days_worked: daysWorked,
        nodal_vpa: NODAL_VPA,
        upi_txn_ref: txnRef,
        status: 'initiated',
      })
      if (error) { setErr(error.message); return }

      // 2. Build the UPI deep link.
      const uri = buildUpiIntent({
        pa: NODAL_VPA,
        pn: PAYEE_NAME,
        am: amount,
        tn: `Salary ${workerName} ${periodStart.slice(0, 7)}`,
        tr: txnRef,
      })

      // 3. Mobile → launch UPI app. Desktop → show QR modal.
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|iPhone|iPad/i.test(navigator.userAgent)

      if (isMobile) {
        window.location.href = uri
      } else {
        setQr({ uri, txnRef })
      }
    })
  }

  return (
    <>
      <div className="flex flex-col items-stretch gap-1">
        <button
          onClick={onSettle}
          disabled={pending || amount <= 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:bg-neutral-300"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
          Settle ₹{amount.toLocaleString('en-IN')}
        </button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>

      {qr && (
        <UpiQrModal
          uri={qr.uri}
          txnRef={qr.txnRef}
          amount={amount}
          workerName={workerName}
          onClose={() => setQr(null)}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────
// Desktop UPI QR modal
// ──────────────────────────────────────────────────────────────

function UpiQrModal({
  uri, txnRef, amount, workerName, onClose,
}: {
  uri: string
  txnRef: string
  amount: number
  workerName: string
  onClose: () => void
}) {
  // qrserver.com renders any string as a scannable QR PNG.
  // Encoding is critical — the UPI URI contains '&' and ':'.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(uri)}`

  const [utr, setUtr] = useState('')
  const [saving, startSave] = useTransition()
  const [done, setDone]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copyUri = async () => {
    try {
      await navigator.clipboard.writeText(uri)
    } catch { /* clipboard may be blocked; ignore */ }
  }

  const confirmPaid = () => {
    setError(null)
    const trimmed = utr.trim()
    if (!trimmed) { setError('Paste the UTR from your UPI app'); return }

    startSave(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('payments')
        .update({ status: 'completed', utr: trimmed })
        .eq('upi_txn_ref', txnRef)
      if (error) { setError(error.message); return }
      setDone(true)
      // Soft refresh so dues / history update.
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 p-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Pay {workerName}
            </p>
            <p className="text-xs text-neutral-500">
              ₹{amount.toLocaleString('en-IN')} · Scan with any UPI app
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {done ? (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <CheckCircle2 size={48} className="text-emerald-500" />
            <p className="mt-3 text-base font-semibold text-neutral-900">Payment recorded</p>
            <p className="mt-1 text-xs text-neutral-500">Refreshing…</p>
          </div>
        ) : (
          <div className="p-5">
            {/* QR */}
            <div className="flex justify-center">
              <img
                src={qrSrc}
                alt="UPI QR code"
                width={240}
                height={240}
                className="rounded-xl border border-neutral-200"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-[11px]">
              <span className="truncate font-mono text-neutral-600">{uri}</span>
              <button
                onClick={copyUri}
                className="shrink-0 inline-flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-700"
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            {/* UTR confirm */}
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                After paying, enter the UTR
              </label>
              <input
                value={utr}
                onChange={e => setUtr(e.target.value)}
                placeholder="12-digit txn reference"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}

              <button
                onClick={confirmPaid}
                disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:bg-neutral-300"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Mark as paid
              </button>

              <p className="mt-2 text-[11px] text-neutral-400 text-center">
                The UTR appears in your UPI app's transaction history.
                For testing, you can type any 12 digits.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
