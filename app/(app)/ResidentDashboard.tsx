/**
 * Resident Dashboard — Modern UI (Urban Company / Uber style).
 * Server component; parent passes profile as prop.
 */
import Link from 'next/link'
import { Users, IndianRupee, CalendarCheck, ChevronRight, Plus } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import AttendanceToggle from '@/components/AttendanceToggle'
import PaymentButton from '@/components/PaymentButton'
import { computeDues } from '@/lib/upi'

type Worker = {
  id: string
  full_name: string
  specialty: string
  trust_score: number
  photo_url: string | null
}
type Engagement = {
  id: string
  monthly_salary: number
  service_type: string | null
  worker: Worker
}
type AttendanceRow = { engagement_id: string; date: string; status: string }

export default async function ResidentDashboard({
  userId,
  profile,
}: {
  userId: string
  profile: { full_name: string | null; flat_number: string | null } | null
}) {
  const supabase = createServerClient()

  const { data: engagements } = await supabase
    .from('engagements')
    .select(`
      id, monthly_salary, service_type,
      worker:workers ( id, full_name, specialty, trust_score, photo_url )
    `)
    .eq('employer_id', userId)
    .eq('status', 'active')
    .returns<Engagement[]>()

  const engagementIds = (engagements ?? []).map(e => e.id)

  const today     = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const todayStr   = today.toISOString().slice(0, 10)
  const startStr   = monthStart.toISOString().slice(0, 10)
  const endStr     = monthEnd.toISOString().slice(0, 10)
  const daysInMonth = monthEnd.getDate()
  const monthLabel  = monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  let attendance: AttendanceRow[] = []
  if (engagementIds.length) {
    const { data } = await supabase
      .from('attendance')
      .select('engagement_id, date, status')
      .in('engagement_id', engagementIds)
      .gte('date', startStr)
      .lte('date', endStr)
      .returns<AttendanceRow[]>()
    attendance = data ?? []
  }

  const stats = new Map<string, { daysWorked: number; today: 'present' | 'absent' | null }>()
  for (const id of engagementIds) stats.set(id, { daysWorked: 0, today: null })
  for (const a of attendance) {
    const s = stats.get(a.engagement_id)!
    if (a.status === 'present')  s.daysWorked += 1
    if (a.status === 'half_day') s.daysWorked += 0.5
    if (a.date === todayStr)     s.today = a.status as 'present' | 'absent'
  }

  const totalDues = (engagements ?? []).reduce((sum, e) => {
    const s = stats.get(e.id)!
    return sum + computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
  }, 0)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Resident'
  const initials  = (profile?.full_name ?? 'R')
    .split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Gradient header ── */}
      <header className="bg-gradient-to-br from-violet-700 to-violet-500 px-5 pt-14 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-violet-200 text-xs mb-0.5">Namaste 👋</p>
            <h1 className="text-2xl font-bold text-white">{firstName}</h1>
            {profile?.flat_number && (
              <p className="text-violet-200 text-xs mt-0.5">Flat {profile.flat_number}</p>
            )}
          </div>
          <div className="h-11 w-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        </div>
      </header>

      {/* ── Stats card (overlaps header) ── */}
      <section className="px-5 -mt-10">
        <div className="rounded-3xl bg-white shadow-lg shadow-violet-100 border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                {monthLabel} · Dues so far
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 flex items-center gap-0.5">
                <IndianRupee size={22} strokeWidth={2.5} className="text-violet-600" />
                {totalDues.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="space-y-2.5">
              <StatPill icon={Users} value={engagements?.length ?? 0} label="Helpers" />
              <StatPill icon={CalendarCheck} value={attendance.length} label="Marks" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Helpers list ── */}
      <section className="px-5 mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Helpers</h2>
          <Link
            href="/directory"
            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 rounded-full px-3 py-1.5"
          >
            <Plus size={12} />
            Hire
          </Link>
        </div>

        {(!engagements || engagements.length === 0) ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {engagements.map(e => {
              const s    = stats.get(e.id)!
              const dues = computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
              return (
                <li key={e.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">

                  {/* Worker info row */}
                  <Link href={`/engagement/${e.id}`} className="flex items-center gap-3 group">
                    <Avatar name={e.worker.full_name} url={e.worker.photo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{e.worker.full_name}</p>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">
                        {e.worker.specialty.replace('_', ' ')}
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="text-amber-500 font-medium">★ {e.worker.trust_score.toFixed(1)}</span>
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition" />
                  </Link>

                  {/* Divider */}
                  <div className="my-3.5 border-t border-slate-100" />

                  {/* Attendance + dues row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">
                        Today
                      </p>
                      <AttendanceToggle engagementId={e.id} date={todayStr} initial={s.today} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                        {s.daysWorked} / {daysInMonth} days
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        ₹{dues.toLocaleString('en-IN')} owed
                      </p>
                    </div>
                  </div>

                  {/* Pay button */}
                  <div className="mt-3.5">
                    <PaymentButton
                      engagementId={e.id}
                      amount={dues}
                      daysWorked={s.daysWorked}
                      periodStart={startStr}
                      periodEnd={endStr}
                      workerName={e.worker.full_name}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

/* ── Sub-components ── */

function StatPill({
  icon: Icon, value, label,
}: { icon: React.ComponentType<{ size?: number; className?: string }>; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className="h-6 w-6 rounded-lg bg-violet-50 flex items-center justify-center">
        <Icon size={12} className="text-violet-600" />
      </span>
      <span className="font-semibold text-slate-900">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="h-11 w-11 rounded-2xl object-cover" />
  }
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold">
      {initials}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="h-14 w-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
        <Users size={24} className="text-violet-400" />
      </div>
      <p className="font-semibold text-slate-700">No helpers yet</p>
      <p className="text-sm text-slate-400 mt-1">Browse the directory to hire your first helper.</p>
      <Link
        href="/directory"
        className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
      >
        <Plus size={14} />
        Browse directory
      </Link>
    </div>
  )
}
