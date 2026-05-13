/**
 * ============================================================
 * DASHBOARD — Module 2: Employer Ledger
 * Route: /
 *
 * Renders for an authenticated resident. Shows:
 *   • Greeting + month summary (active helpers, total dues this month)
 *   • One card per active engagement:
 *       - worker name + specialty + trust score
 *       - today's attendance quick toggle
 *       - month-to-date days worked + amount owed
 *       - "Settle ₹X" button (launches UPI deep link)
 *
 * This is a React Server Component — initial render fetches with the
 * user's session cookie, RLS does the rest. Interactive widgets
 * (toggle, settle) are client components inside.
 * ============================================================
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, IndianRupee, CalendarCheck, ChevronRight } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import AttendanceToggle from '@/components/AttendanceToggle'
import PaymentButton from '@/components/PaymentButton'
import { computeDues } from '@/lib/upi'

export const dynamic = 'force-dynamic'   // always read fresh dues

// ---------- Types (light — generate the real ones with `supabase gen types`) ----------
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

// ---------- Page ----------
export default async function DashboardPage() {
  const supabase = createServerClient()

  // 1. Auth gate — middleware will usually redirect first, but belt-and-braces.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Profile (for greeting).
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, flat_number')
    .eq('id', user.id)
    .single()

  // 3. Active engagements + worker join.
  const { data: engagements } = await supabase
    .from('engagements')
    .select(`
      id, monthly_salary, service_type,
      worker:workers ( id, full_name, specialty, trust_score, photo_url )
    `)
    .eq('employer_id', user.id)
    .eq('status', 'active')
    .returns<Engagement[]>()

  const engagementIds = (engagements ?? []).map(e => e.id)

  // 4. Current-month attendance for all those engagements, one round-trip.
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const todayStr   = today.toISOString().slice(0, 10)
  const startStr   = monthStart.toISOString().slice(0, 10)
  const endStr     = monthEnd.toISOString().slice(0, 10)
  const daysInMonth = monthEnd.getDate()

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

  // 5. Roll up per engagement (days worked + dues).
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

  // ---------- Render ----------
  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-5 pt-6 pb-4">
        <p className="text-sm text-neutral-500">Namaste 👋</p>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {profile?.full_name ?? 'Resident'}
        </h1>
        {profile?.flat_number && (
          <p className="text-xs text-neutral-500 mt-0.5">Flat {profile.flat_number}</p>
        )}
      </header>

      {/* Month summary */}
      <section className="px-5 -mt-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
          <p className="text-xs/5 uppercase tracking-wider opacity-80">
            {monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs opacity-80">Dues so far</p>
              <p className="text-3xl font-bold flex items-center">
                <IndianRupee size={22} className="mr-0.5" />
                {totalDues.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right">
              <Stat icon={Users} value={engagements?.length ?? 0} label="Helpers" />
              <Stat icon={CalendarCheck} value={attendance.length} label="Marks" />
            </div>
          </div>
        </div>
      </section>

      {/* Engagements list */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-700">Your Helpers</h2>
          <Link href="/directory" className="text-xs font-medium text-indigo-600">
            Hire more →
          </Link>
        </div>

        {(!engagements || engagements.length === 0) ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {engagements.map(e => {
              const s = stats.get(e.id)!
              const dues = computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
              return (
                <li key={e.id} className="rounded-2xl bg-white border border-neutral-200 p-4">
                  {/* Row 1: identity + drill-in */}
                  <Link href={`/engagement/${e.id}`} className="flex items-center gap-3 group">
                    <Avatar name={e.worker.full_name} url={e.worker.photo_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{e.worker.full_name}</p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {e.worker.specialty.replace('_', ' ')} • ★ {e.worker.trust_score.toFixed(1)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-500" />
                  </Link>

                  {/* Row 2: today + month-to-date */}
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400">Today</p>
                      <div className="mt-1">
                        <AttendanceToggle
                          engagementId={e.id}
                          date={todayStr}
                          initial={s.today}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                        {s.daysWorked} of {daysInMonth} days
                      </p>
                      <p className="text-sm font-semibold text-neutral-900">
                        ₹{dues.toLocaleString('en-IN')} owed
                      </p>
                    </div>
                  </div>

                  {/* Row 3: settle */}
                  <div className="mt-3">
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

// ---------- Tiny presentational helpers (kept local — not reusable enough to split) ----------

function Stat({ icon: Icon, value, label }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs/5 opacity-90 justify-end">
      <Icon size={12} />
      <span className="font-semibold">{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />
  }
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
      {initials}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-neutral-300 p-8 text-center">
      <p className="text-sm text-neutral-600">No active helpers yet.</p>
      <Link
        href="/directory"
        className="inline-block mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Browse the directory
      </Link>
    </div>
  )
}
