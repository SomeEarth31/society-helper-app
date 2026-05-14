/**
 * Resident (Employer) Dashboard — extracted from the original
 * app/(app)/page.tsx. Renders greeting, month-to-date dues, and
 * the list of active engagements with attendance + settle controls.
 *
 * This is a server component; it expects the parent to have already
 * authenticated the user and to pass the profile in as a prop.
 */
import Link from 'next/link'
import { Users, IndianRupee, CalendarCheck, ChevronRight } from 'lucide-react'
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

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      <header className="bg-white border-b border-neutral-200 px-5 pt-7 pb-5">
        <p className="text-sm text-neutral-500">Namaste 👋</p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {profile?.full_name ?? 'Resident'}
        </h1>
        {profile?.flat_number && (
          <p className="mt-0.5 text-xs text-neutral-500">Flat {profile.flat_number}</p>
        )}
      </header>

      <section className="px-5 -mt-4">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-md">
          <p className="text-[11px] uppercase tracking-wider opacity-80">
            {monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs opacity-80">Dues so far</p>
              <p className="mt-1 text-3xl font-bold flex items-center">
                <IndianRupee size={22} className="mr-0.5" />
                {totalDues.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Stat icon={Users} value={engagements?.length ?? 0} label="Helpers" />
              <Stat icon={CalendarCheck} value={attendance.length} label="Marks" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 mt-7">
        <div className="mb-3 flex items-center justify-between">
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
                <li key={e.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <Link href={`/engagement/${e.id}`} className="flex items-center gap-3 group">
                    <Avatar name={e.worker.full_name} url={e.worker.photo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-900">{e.worker.full_name}</p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {e.worker.specialty.replace('_', ' ')} • ★ {e.worker.trust_score.toFixed(1)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-500" />
                  </Link>

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400">Today</p>
                      <div className="mt-1">
                        <AttendanceToggle engagementId={e.id} date={todayStr} initial={s.today} />
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

function Stat({ icon: Icon, value, label }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  value: number; label: string
}) {
  return (
    <div className="flex items-center justify-end gap-1.5 text-xs/5 opacity-90">
      <Icon size={12} />
      <span className="font-semibold">{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
      {initials}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-sm text-neutral-600">No active helpers yet.</p>
      <Link href="/directory"
        className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
        Browse the directory
      </Link>
    </div>
  )
}
