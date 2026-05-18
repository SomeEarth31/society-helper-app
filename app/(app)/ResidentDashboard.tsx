/**
 * Resident Dashboard — Uber/Urban Company grade UI.
 * Server component.
 */
import Link from 'next/link'
import { Users, IndianRupee, CalendarCheck, Plus, TrendingUp } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import InviteWorkersButton from '@/components/InviteWorkersButton'
import HelperEngagementCard from '@/components/HelperEngagementCard'
import type { EngCardData } from '@/components/HelperEngagementCard'
import { computeDues } from '@/lib/upi'
import { getServerTranslations } from '@/lib/i18n/server'

type Worker = {
  id: string; full_name: string; specialty: string
  trust_score: number | null; photo_url: string | null
  reviews: { count: number }[]
}
type Engagement = {
  id: string; monthly_salary: number; service_type: string | null; worker: Worker
}
type AttendanceRow = { engagement_id: string; date: string; status: string }

export default async function ResidentDashboard({
  userId,
  profile,
}: {
  userId: string
  profile: { full_name: string | null; flat_number: string | null; society_id: string | null } | null
}) {
  const supabase = createServerClient()
  const T = getServerTranslations()

  // Fetch society name if profile has one
  let societyName: string | null = null
  if (profile?.society_id) {
    const { data: soc } = await supabase
      .from('societies')
      .select('name')
      .eq('id', profile.society_id)
      .maybeSingle()
    societyName = soc?.name ?? null
  }

  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, monthly_salary, service_type, worker:workers ( id, full_name, specialty, trust_score, photo_url, reviews(count) )')
    .eq('employer_id', userId)
    .eq('status', 'active')
    .returns<Engagement[]>()

  const engIds = (engagements ?? []).map(e => e.id)
  const today  = new Date()
  const yr = today.getFullYear()
  const mo = today.getMonth() // 0-indexed
  // Use local date strings to avoid UTC/IST timezone shift
  const todayStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const startStr = `${yr}-${String(mo + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(yr, mo + 1, 0).getDate()
  const endStr   = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  const monthLabel  = new Date(yr, mo, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  let attendance: AttendanceRow[] = []
  if (engIds.length) {
    const { data } = await supabase
      .from('attendance')
      .select('engagement_id, date, status')
      .in('engagement_id', engIds)
      .gte('date', startStr).lte('date', endStr)
      .returns<AttendanceRow[]>()
    attendance = data ?? []
  }

  // Compute total dues for summary card (server-side)
  const totalDues = (engagements ?? []).reduce((sum, e) => {
    const engAtt = attendance.filter(a => a.engagement_id === e.id)
    const daysWorked = engAtt.reduce((s, a) =>
      s + (a.status === 'present' ? 1 : a.status === 'half_day' ? 0.5 : 0), 0)
    return sum + computeDues(e.monthly_salary, daysWorked, daysInMonth)
  }, 0)

  // Group engagements by worker_id, attaching full attendance per engagement
  type WorkerGroup = {
    worker: Engagement['worker']
    engagements: EngCardData[]
  }
  const workerGroups: WorkerGroup[] = []
  const seenWorkers = new Map<string, WorkerGroup>()
  for (const e of engagements ?? []) {
    const cardData: EngCardData = {
      id: e.id,
      monthly_salary: e.monthly_salary,
      service_type: e.service_type,
      workerSpecialty: e.worker.specialty,
      attendance: attendance
        .filter(a => a.engagement_id === e.id)
        .map(a => ({ date: a.date, status: a.status })),
    }
    if (seenWorkers.has(e.worker.id)) {
      seenWorkers.get(e.worker.id)!.engagements.push(cardData)
    } else {
      const g: WorkerGroup = { worker: e.worker, engagements: [cardData] }
      seenWorkers.set(e.worker.id, g)
      workerGroups.push(g)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Resident'
  const initials  = (profile?.full_name ?? 'R').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Header ── */}
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">
              {monthLabel}
            </p>
            <h1 className="text-2xl font-black text-slate-900">{T.resident.greeting(firstName)}</h1>
            {(profile?.flat_number || societyName) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {societyName && <span>{societyName}</span>}
                {societyName && profile?.flat_number && <span> · </span>}
                {profile?.flat_number && <span>Flat {profile.flat_number}</span>}
              </p>
            )}
          </div>
          <Link
            href="/profile"
            className="h-12 w-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200"
          >
            <span className="text-white font-black text-sm">{initials}</span>
          </Link>
        </div>
      </header>

      {/* ── Summary card ── */}
      <section className="px-5 mt-5">
        <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-violet-500 p-5 shadow-xl shadow-violet-200">
          <p className="text-violet-200 text-[11px] font-bold uppercase tracking-widest">
            {T.resident.duesSoFar}
          </p>
          <p className="text-4xl font-black text-white mt-2 flex items-center gap-1">
            <IndianRupee size={26} strokeWidth={2.5} />
            {totalDues.toLocaleString('en-IN')}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-5">
            <Chip icon={Users} value={workerGroups.length} label={T.resident.helpers} />
            <Chip icon={CalendarCheck} value={attendance.length} label={T.resident.marks} />
            <Chip icon={TrendingUp} value={daysInMonth} label={T.resident.daysPerMonth} />
          </div>
        </div>
      </section>

      {/* ── Helpers ── */}
      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">{T.resident.yourHelpers}</h2>
          <div className="flex items-center gap-2">
            <InviteWorkersButton />
            <Link
              href="/directory"
              className="inline-flex items-center gap-1 rounded-2xl bg-violet-50 border border-violet-100 px-3 py-1.5 text-xs font-bold text-violet-600"
            >
              <Plus size={12} />
              {T.common.hire}
            </Link>
          </div>
        </div>

        {workerGroups.length === 0 ? (
          <EmptyState
            title={T.resident.noHelpers}
            desc={T.resident.noHelpersDesc}
            cta={T.resident.browseDirectory}
          />
        ) : (
          <ul className="space-y-3">
            {workerGroups.map(group => (
              <HelperEngagementCard
                key={group.worker.id}
                workerId={group.worker.id}
                workerName={group.worker.full_name}
                workerPhotoUrl={group.worker.photo_url}
                workerTrustScore={group.worker.trust_score}
                reviewCount={group.worker.reviews?.[0]?.count ?? 0}
                engagements={group.engagements}
                daysInMonth={daysInMonth}
                todayStr={todayStr}
                startStr={startStr}
                endStr={endStr}
                userId={userId}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

/* ── Sub-components ── */

function Chip({ icon: Icon, value, label }: {
  icon: React.ElementType
  value: number; label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-violet-200" />
      <span className="text-white font-black text-sm">{value}</span>
      <span className="text-violet-200 text-xs">{label}</span>
    </div>
  )
}


function EmptyState({ title, desc, cta }: { title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="h-16 w-16 rounded-3xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
        <Users size={28} className="text-violet-300" />
      </div>
      <p className="font-black text-slate-700 text-base">{title}</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{desc}</p>
      <Link
        href="/directory"
        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200"
      >
        <Plus size={14} />
        {cta}
      </Link>
    </div>
  )
}
