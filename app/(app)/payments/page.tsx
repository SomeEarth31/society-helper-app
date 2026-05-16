/**
 * PAYMENTS — Settlement history
 * Route: /payments
 */
import { redirect } from 'next/navigation'
import { IndianRupee, Calendar, CheckCircle2, Clock, XCircle, Wallet } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PaymentRow = {
  id: string
  amount: number
  status: 'initiated' | 'completed' | 'failed' | 'disputed' | string
  upi_txn_ref: string | null
  utr: string | null
  created_at: string
  period_start: string | null
  period_end: string | null
  engagement: {
    id: string
    worker: { full_name: string; specialty: string | null } | null
  } | null
}

export default async function PaymentsPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, amount, status, upi_txn_ref, utr, created_at,
      period_start, period_end,
      engagement:engagements ( id, worker:workers ( full_name, specialty ) )
    `)
    .order('created_at', { ascending: false })
    .returns<PaymentRow[]>()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabel = monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const monthTotal = (payments ?? [])
    .filter(p => p.status === 'completed' && new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Header ── */}
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">
          {monthLabel}
        </p>
        <h1 className="text-2xl font-black text-slate-900">Payments</h1>
        <p className="text-xs text-slate-400 mt-0.5">Settlement history</p>
      </header>

      {/* ── Month total card ── */}
      <section className="px-5 mt-5">
        <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-violet-500 p-5 shadow-xl shadow-violet-200">
          <p className="text-violet-200 text-[11px] font-bold uppercase tracking-widest">
            Paid this month
          </p>
          <p className="text-4xl font-black text-white mt-2 flex items-center gap-1">
            <IndianRupee size={26} strokeWidth={2.5} />
            {monthTotal.toLocaleString('en-IN')}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Wallet size={12} className="text-violet-200" />
              <span className="text-white font-black text-sm">{payments?.length ?? 0}</span>
              <span className="text-violet-200 text-xs">transactions</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── History ── */}
      <section className="px-5 mt-7">
        <h2 className="text-lg font-black text-slate-900 mb-4">History</h2>

        {(!payments || payments.length === 0) ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Wallet size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-500">No payments yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Settlements you make from the dashboard will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {payments.map(p => (
              <li key={p.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      p.status === 'completed' ? 'bg-emerald-50' :
                      p.status === 'failed'    ? 'bg-rose-50' : 'bg-amber-50'
                    }`}>
                      {p.status === 'completed' ? (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      ) : p.status === 'failed' ? (
                        <XCircle size={18} className="text-rose-500" />
                      ) : (
                        <Clock size={18} className="text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-[15px] truncate">
                        {p.engagement?.worker?.full_name ?? 'Unknown helper'}
                      </p>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">
                        {(p.engagement?.worker?.specialty ?? '').replace(/_/g, ' ') || 'Salary'}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-300">
                        <Calendar size={10} />
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-900 flex items-center justify-end">
                      <IndianRupee size={14} />
                      {p.amount.toLocaleString('en-IN')}
                    </p>
                    <StatusPill status={p.status} />
                  </div>
                </div>

                {(p.utr || p.upi_txn_ref) && (
                  <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-300 font-mono truncate">
                    {p.utr ? `UTR · ${p.utr}` : `Ref · ${p.upi_txn_ref}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    initiated: { label: 'Initiated', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    failed:    { label: 'Failed',    cls: 'bg-rose-50 text-rose-700 border-rose-100' },
    disputed:  { label: 'Disputed',  cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  }
  const meta = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
