'use client'
/**
 * PaymentButton — the "Settle Salary" CTA.
 *
 * Flow:
 *  1. User taps button → we POST a `payments` row (status: 'initiated').
 *  2. We build a UPI Intent URI and set window.location = uri.
 *     On mobile, the OS opens the user's default UPI app with everything
 *     pre-filled (payee, amount, note, txn ref).
 *  3. After the user returns, a follow-up dialog prompts them to paste
 *     the UTR. (Implemented in the engagement page; out of scope for the
 *     dashboard quick-action.)
 */
import { useState, useTransition } from 'react'
import { Wallet, Loader2 } from 'lucide-react'
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

  const onSettle = () => {
    setErr(null)
    start(async () => {
      const supabase = createClient()
      const txnRef = generateTxnRef()

      // 1. Record an "initiated" payment (RLS-protected: only the employer can insert).
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
        tn: `Salary ${workerName} ${periodStart.slice(0,7)}`,
        tr: txnRef,
      })

      // 3. Launch UPI app. On desktop this no-ops (no handler) — guard:
      if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        window.location.href = uri
      } else {
        // Desktop: show a QR fallback. (Use any qrcode lib; stubbed for now.)
        prompt('Open this on your phone or scan as QR:', uri)
      }
    })
  }

  return (
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
  )
}
