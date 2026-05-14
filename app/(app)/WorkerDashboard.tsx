/**
 * Worker Dashboard — shown to users whose profile.role === 'worker'.
 *
 *   • Monthly earnings card (sum of completed payments this month).
 *   • Active engagements (homes they work at).
 *   • Available job openings in their society, filtered by specialty.
 */
import Link from 'next/link'
import { IndianRupee, CalendarCheck, BadgeIndianRupee, Briefcase, ChevronRight, MapPin } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

type WorkerSelf = {
  id: string
  full_name: string
  specialty: string
  daily_rate: number | null
  society_id: string | null
  photo_url: string | null
}

type EngagementRow = {
  id: string
  monthly_salary: number
  status: string
  employer: { full_name: string | null; flat_number: string | null } | null
}

type PaymentRow = {
  amount: number
  status: string
  created_at: string
}

type JobRow = {
  id: string
  specialty: string
  description: string | null
  offered_salary: number | null
  created_at: string
  employer: { full_name: string | null; flat_number: string | null } | null
}

export default async function WorkerDashboard({
  userId,
  profile,
}: {
  userId: string
  profile: { full_name: string | null } | null
}) {
  const supabase = createServerClient()

  // 1. Worker row.
  const { data: worker } = await supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, society_id, photo_url')
    .eq('auth_id', userId)
    .maybeSingle<WorkerSelf>()

  // 2. Active engagements with employer info.
  const { data: engagements } = await supabase
    .from('engagements')
    .select(`
      id, monthly_salary, status,
      employer:profiles!engagements_employer_id_fkey ( full_name, flat_number )
    `)
    .eq('worker_id', worker?.id ?? '00000000-0000-0000-0000-000000000000')
    .eq('status', 'active')
    .returns<EngagementRow[]>()

  // 3. Earnings: sum payments completed this month for our engagements.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const startIso = monthStart.toISOString()
  const monthLabel = monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const engIds = (engagements ?? []).map(e => e.id)
  let monthEarnings = 0
  if (engIds.length) {
    const { data: pays } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .in('engagement_id', engIds)
      .gte('created_at', startIso)
      .returns<PaymentRow[]>()
    monthEarnings = (pays ?? [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
  }

  // 4. Available openings in the worker's society matching their specialty.
  let jobs: JobRow[] = []
  if (worker?.society_id) {
    const { data } = await supabase
      .from('job_postings')
      .select(`
        id, specialty, description, offered_salary, created_at,
        employer:profiles!job_postings_employer_id_fkey ( full_name, flat_number )
      `)
      .eq('society_id', worker.society_id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .returns<JobRow[]>()
    jobs = (data ?? []).filter(j => !worker.specialty || j.specialty === worker.specialty)
  }

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      <header className="bg-white border-b border-neutral-200 px-5 pt-7 pb-5">
        <p className="text-sm text-neutral-500">Namaste 🙏</p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {profile?.full_name ?? worker?.full_name ?? 'Helper'}
        </h1>
        {worker?.specialty && (
          <p className="mt-0.5 text-xs capitalize text-neutral-500">
            {worker.specialty.replace('_', ' ')}
            {worker.daily_rate ? ` · ₹${worker.daily_rate}/day` : ''}
          </p>
        )}
      </header>

      {/* Earnings card */}
      <section className="px-5 -mt-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-md">
          <p className="text-[11px] uppercase tracking-wider opacity-80">{monthLabel}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs opacity-80">Earned this month</p>
              <p className="mt-1 text-3xl font-bold flex items-center">
                <IndianRupee size={22} className="mr-0.5" />
                {monthEarnings.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right space-y-1 text-xs/5 opacity-90">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck size={12} />
                <span className="font-semibold">{engagements?.length ?? 0}</span>
                <span className="opacity-75">Homes</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Engagements */}
      <section className="px-5 mt-7">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Active engagements</h2>
        {!engagements?.length ? (
          <Empty text="You don't have any active homes yet. Check the openings below." />
        ) : (
          <ul className="space-y-3">
            {engagements.map(e => (
              <li key={e.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {e.employer?.full_name ?? 'Resident'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin size={11} />
                      Flat {e.employer?.flat_number ?? '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400">Monthly</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      ₹{e.monthly_salary.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Available openings */}
      <section className="px-5 mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Available openings</h2>
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">
            {jobs.length} {jobs.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {jobs.length === 0 ? (
          <Empty text="No openings right now. We'll show new ones the moment they're posted." />
        ) : (
          <ul className="space-y-3">
            {jobs.map(j => (
              <li key={j.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 capitalize">
                      <Briefcase size={14} className="text-indigo-600" />
                      {j.specialty.replace('_', ' ')} needed
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {j.employer?.full_name ?? 'Resident'}
                      {j.employer?.flat_number ? ` · Flat ${j.employer.flat_number}` : ''}
                    </p>
                    {j.description && (
                      <p className="mt-2 text-xs text-neutral-600 line-clamp-2">{j.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {j.offered_salary != null && (
                      <p className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <BadgeIndianRupee size={12} className="mr-0.5" />
                        ₹{j.offered_salary.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!worker && (
        <section className="mx-5 mt-7 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Finish your helper profile</p>
          <p className="mt-1 text-xs text-amber-700">
            We couldn't find a worker record linked to your account.
            <Link href="/worker-profile" className="ml-1 font-semibold underline">Complete it →</Link>
          </p>
        </section>
      )}
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
      <p className="text-sm text-neutral-600">{text}</p>
    </div>
  )
}
