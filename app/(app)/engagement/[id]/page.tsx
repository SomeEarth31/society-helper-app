/**
 * ============================================================
 * ENGAGEMENT DETAIL — Worker + monthly attendance + settle
 * Route: /engagement/[id]
 *
 * Reached from the dashboard helper card. Shows:
 *   • Worker identity (photo, name, specialty, trust score)
 *   • Current-month attendance calendar (tap a day to mark)
 *   • Days worked + dues running total
 *   • Settle Payment button — opens the UPI intent flow
 *
 * Data fetch is server-side; the calendar is a client island
 * that calls the `markAttendance` server action on each tap
 * so the URL never needs to bounce.
 * ============================================================
 */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, IndianRupee, Star, Phone, CalendarCheck } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { computeDues } from '@/lib/upi'
import PaymentButton from '@/components/PaymentButton'
import AttendanceCalendar from './AttendanceCalendar'

export const dynamic = 'force-dynamic'

type Worker = {
  id: string
  full_name: string
  specialty: string
  trust_score: number
  daily_rate: number | null
  photo_url: string | null
  phone: string | null
}

type Engagement = {
  id: string
  monthly_salary: number
  service_type: string | null
  status: string
  worker: Worker
}

type AttendanceRow = {
  engagement_id: string
  date: string
  status: 'present' | 'absent' | 'half_day'
}

export default async function EngagementPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Engagement + worker join, RLS scopes to the calling resident.
  const { data: engagement } = await supabase
    .from('engagements')
    .select(`
      id, monthly_salary, service_type, status,
      worker:workers ( id, full_name, specialty, trust_score, daily_rate, photo_url, phone )
    `)
    .eq('id', params.id)
    .single<Engagement>()

  if (!engagement) notFound()

  // Month bounds.
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const startStr   = monthStart.toISOString().slice(0, 10)
  const endStr     = monthEnd.toISOString().slice(0, 10)
  const daysInMonth = monthEnd.getDate()

  const { data: attendance } = await supabase
    .from('attendance')
    .select('engagement_id, date, status')
    .eq('engagement_id', engagement.id)
    .gte('date', startStr)
    .lte('date', endStr)
    .returns<AttendanceRow[]>()

  const rows = attendance ?? []

  // Roll-up: days worked (present = 1, half_day = 0.5)
  let daysWorked = 0
  for (const a of rows) {
    if (a.status === 'present')  daysWorked += 1
    if (a.status === 'half_day') daysWorked += 0.5
  }

  const dues = computeDues(engagement.monthly_salary, daysWorked, daysInMonth)

  // Map date → status for the calendar widget.
  const attendanceMap: Record<string, 'present' | 'absent' | 'half_day'> = {}
  for (const a of rows) attendanceMap[a.date] = a.status

  const monthLabel = monthStart.toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* Header w/ back nav */}
      <header className="bg-white border-b border-neutral-200 px-5 pt-5 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
        >
          <ChevronLeft size={14} />
          Back
        </Link>

        <div className="mt-3 flex items-center gap-4">
          <Avatar name={engagement.worker.full_name} url={engagement.worker.photo_url} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-900 truncate">
              {engagement.worker.full_name}
            </h1>
            <p className="text-xs text-neutral-500 capitalize">
              {(engagement.worker.specialty ?? '').replace('_', ' ')}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs text-neutral-600">
              <span className="flex items-center gap-0.5">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                <span className="font-semibold">{engagement.worker.trust_score?.toFixed(1)}</span>
              </span>
              {engagement.worker.phone && (
                <a
                  href={`tel:${engagement.worker.phone}`}
                  className="flex items-center gap-1 text-indigo-600 font-medium"
                >
                  <Phone size={12} />
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Summary card */}
      <section className="px-5 -mt-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
          <p className="text-xs/5 uppercase tracking-wider opacity-80">{monthLabel}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs opacity-80">Amount owed</p>
              <p className="text-3xl font-bold flex items-center">
                <IndianRupee size={22} className="mr-0.5" />
                {dues.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right text-xs/5 opacity-90">
              <CalendarCheck size={20} className="ml-auto" />
              <p className="mt-1">
                <span className="font-semibold">{daysWorked}</span>
                <span className="opacity-75"> / {daysInMonth} days</span>
              </p>
              <p className="opacity-75">
                Salary ₹{engagement.monthly_salary.toLocaleString('en-IN')}/mo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section className="px-5 mt-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Attendance</h2>
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-4">
          <AttendanceCalendar
            engagementId={engagement.id}
            year={today.getFullYear()}
            month={today.getMonth()}
            initial={attendanceMap}
          />
          <div className="mt-4 flex items-center justify-around border-t border-neutral-100 pt-3 text-[11px]">
            <LegendDot color="bg-emerald-500" label="Present" />
            <LegendDot color="bg-amber-400"  label="Half day" />
            <LegendDot color="bg-rose-500"   label="Absent" />
            <LegendDot color="bg-neutral-200" label="Unmarked" />
          </div>
        </div>
      </section>

      {/* Settle */}
      <section className="px-5 mt-6">
        <PaymentButton
          engagementId={engagement.id}
          amount={dues}
          daysWorked={daysWorked}
          periodStart={startStr}
          periodEnd={endStr}
          workerName={engagement.worker.full_name}
        />
        <p className="mt-2 text-center text-[11px] text-neutral-400">
          Opens your UPI app. Paste the UTR back here once paid.
        </p>
      </section>
    </main>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="h-14 w-14 rounded-full object-cover" />
  }
  const initials = name
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-semibold">
      {initials}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-neutral-500">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}
