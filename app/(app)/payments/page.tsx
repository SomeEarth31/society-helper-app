/**
 * ============================================================
 * PAYMENTS — History & this-month total
 * Route: /payments
 *
 * Lists every `payments` row visible to the resident (RLS does
 * the scoping), grouped chronologically with worker name and
 * UPI status. The header card surfaces the month-to-date total
 * so the user can sanity-check at a glance.
 * ============================================================
 */
import { redirect } from 'next/navigation'
import { IndianRupee, Calendar, CheckCircle2, Clock, XCircle, Wallet } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PaymentRow = {
  id: string
  amount: number
  status: 'initiated' | 'pending' | 'completed' | 'failed' | string
  upi_txn_ref: string | null
  utr: string | null
  created_at: string
  // Optional period fields (used by the dashboard's Settle flow).
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

  // Join through `engagements` → `workers` so we can show who the payment was for.
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, amount, status, upi_txn_ref, utr, created_at,
      period_start, period_end,
      engagement:engagements (
        id,
        worker:workers ( full_name, specialty )
      )
    `)
    .order('created_at', { ascending: false })
    .returns<PaymentRow[]>()

  // Month total — completed payments dated within the current calendar month.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabel = monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const monthTotal = (payments ?? [])
    .filter(p => p.status === 'completed' && new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-5 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Settlement history</p>
      </header>

      {/* Month total card */}
      <section className="px-5 -mt-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
          <p className="text-xs/5 uppercase tracking-wider opacity-80">{monthLabel}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs opacity-80">Paid this month</p>
              <p className="text-3xl font-bold flex items-center">
                <IndianRupee size={22} className="mr-0.5" />
                {monthTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right text-xs/5 opacity-90">
              <Wallet size={20} className="ml-auto" />
              <p className="mt-1">{payments?.length ?? 0} total</p>
            </div>
          </div>
        </div>
      </section>

      {/* History list */}
      <section className="px-5 mt-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">History</h2>

        {(!payments || payments.length === 0) ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {payments.map(p => (
              <li
                key={p.id}
                className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">
                      {p.engagement?.worker?.full_name ?? 'Unknown helper'}
                    </p>
                    <p className="text-xs text-neutral-500 capitalize">
                      {(p.engagement?.worker?.specialty ?? '').replace('_', ' ') || 'Salary settlement'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
                      <Calendar size={11} />
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-semibold text-neutral-900 flex items-center justify-end">
                      <IndianRupee size={14} />
                      {p.amount.toLocaleString('en-IN')}
                    </p>
                    <StatusPill status={p.status} />
                  </div>
                </div>

                {(p.utr || p.upi_txn_ref) && (
                  <p className="mt-2 border-t border-neutral-100 pt-2 text-[11px] text-neutral-400 font-mono truncate">
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
  const map: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    completed: { label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
    pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700',     Icon: Clock },
    initiated: { label: 'Initiated', cls: 'bg-amber-50 text-amber-700',     Icon: Clock },
    failed:    { label: 'Failed',    cls: 'bg-rose-50 text-rose-700',       Icon: XCircle },
  }
  const meta = map[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-600', Icon: Clock }
  const Icon = meta.Icon
  return (
    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-neutral-300 p-8 text-center">
      <p className="text-sm text-neutral-600">No payments yet.</p>
      <p className="mt-1 text-xs text-neutral-400">
        Settlements you make from the dashboard will show up here.
      </p>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
