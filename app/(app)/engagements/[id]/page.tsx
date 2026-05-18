/**
 * /engagements/[id] — Engagement detail page.
 * Resident: full interactive attendance marking, payment, end engagement.
 * Worker:   read-only calendar, end engagement.
 */
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ArrowLeft, Home, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import AttendanceToggle from '@/components/AttendanceToggle'
import PaymentButton from '@/components/PaymentButton'
import EndEngagementButton from '@/components/EndEngagementButton'
import { computeDues } from '@/lib/upi'

export const dynamic = 'force-dynamic'

type AttRow = { date: string; status: string }

export default async function EngagementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: eng } = await supabase
    .from('engagements')
    .select(`
      id, monthly_salary, service_type, status, employer_id,
      employer:profiles!engagements_employer_id_fkey(id, full_name, flat_number),
      worker:workers!engagements_worker_id_fkey(id, full_name, specialty, auth_id)
    `)
    .eq('id', params.id)
    .single()

  if (!eng) notFound()

  const employer   = eng.employer as any
  const worker     = eng.worker as any
  const isResident = employer?.id === user.id
  const isWorker   = worker?.auth_id === user.id
  if (!isResident && !isWorker) notFound()

  // Local date maths — avoid UTC/IST timezone shift
  const now        = new Date()
  const yr         = now.getFullYear()
  const mo         = now.getMonth()
  const todayStr   = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const startStr   = `${yr}-${String(mo + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(yr, mo + 1, 0).getDate()
  const endStr     = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  const monthLabel = new Date(yr, mo, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const { data: attData } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('engagement_id', params.id)
    .gte('date', startStr)
    .lte('date', endStr)
    .returns<AttRow[]>()

  const attendance  = attData ?? []
  const daysWorked  = attendance.reduce((s, a) =>
    s + (a.status === 'present' ? 1 : a.status === 'half_day' ? 0.5 : 0), 0)
  const todayStatus = (attendance.find(a => a.date === todayStr)?.status ?? null) as
    'present' | 'half_day' | 'absent' | null
  const dues        = computeDues(eng.monthly_salary, daysWorked, daysInMonth)

  const workerName   = worker?.full_name ?? 'Helper'
  const employerName = employer?.full_name ?? 'Resident'
  const flatNumber   = employer?.flat_number
  const role         = ((eng.service_type ?? worker?.specialty) ?? 'helper').replace(/_/g, ' ')
  const otherName    = isResident ? workerName : employerName
  const backHref     = isResident ? '/' : '/'

  return (
    <main className="min-h-screen bg-slate-50 pb-28">

      {/* ── Header ── */}
      <header className="bg-white px-5 pt-14 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={backHref}
            className="h-9 w-9 flex items-center justify-center text-slate-500 -ml-1 active:opacity-60">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-slate-900 capitalize truncate">{role}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isResident ? workerName : (
                <span className="flex items-center gap-1">
                  {employerName}
                  {flatNumber && <><Home size={10} className="inline" /> Flat {flatNumber}</>}
                </span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly</p>
            <p className="text-sm font-black text-slate-900 flex items-center gap-0.5">
              <IndianRupee size={12} />
              {eng.monthly_salary.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 mt-5 space-y-5">

        {/* ── Month summary card ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{monthLabel}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-slate-900">{daysWorked}
                <span className="text-base font-bold text-slate-400"> / {daysInMonth} days</span>
              </p>
              {isResident && (
                <p className="text-sm font-bold text-violet-700 mt-0.5 flex items-center gap-0.5">
                  <IndianRupee size={13} />{dues.toLocaleString('en-IN')} due
                </p>
              )}
            </div>
            {eng.status === 'terminated' && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                Ended
              </span>
            )}
          </div>
        </div>

        {/* ── Attendance Calendar ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            {monthLabel} attendance
          </p>
          <MonthCalendar
            attendance={attendance}
            startStr={startStr}
            daysInMonth={daysInMonth}
            todayStr={todayStr}
          />
        </div>

        {/* ── Today's mark (resident only) ── */}
        {isResident && eng.status === 'active' && (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Mark today — {new Date(todayStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
            <AttendanceToggle
              engagementId={params.id}
              date={todayStr}
              initial={todayStatus}
            />
          </div>
        )}

        {/* ── Payment (resident only) ── */}
        {isResident && eng.status === 'active' && (
          <PaymentButton
            engagementId={params.id}
            amount={dues}
            daysWorked={daysWorked}
            periodStart={startStr}
            periodEnd={endStr}
            workerName={workerName}
          />
        )}

        {/* ── End engagement ── */}
        {eng.status === 'active' && (
          <div className="flex gap-2">
            <EndEngagementButton
              engagementId={params.id}
              role={isResident ? 'resident' : 'worker'}
              otherName={otherName}
            />
          </div>
        )}

      </div>
    </main>
  )
}

// ── Month attendance calendar ─────────────────────────────────────────────────
function MonthCalendar({ attendance, startStr, daysInMonth, todayStr }: {
  attendance: AttRow[]
  startStr: string
  daysInMonth: number
  todayStr: string
}) {
  const attMap   = new Map(attendance.map(a => [a.date, a.status]))
  const startDow = new Date(startStr + 'T00:00:00').getDay()
  const prefix   = startStr.slice(0, 7)

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const d       = i + 1
    const dateStr = `${prefix}-${String(d).padStart(2, '0')}`
    const status  = attMap.get(dateStr)
    return { d, status, isPast: dateStr <= todayStr, isToday: dateStr === todayStr }
  })

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => (
          <span key={i} className="text-[9px] font-bold text-slate-400 text-center">{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDow }).map((_, i) => <div key={`pad-${i}`} />)}
        {cells.map(({ d, status, isPast, isToday }) => {
          const cls =
            status === 'present'  ? 'bg-emerald-400 text-white' :
            status === 'half_day' ? 'bg-amber-400 text-white' :
            status === 'absent'   ? 'bg-rose-400 text-white' :
            isPast                ? 'bg-slate-200 text-slate-400' :
                                    'bg-slate-100 text-slate-300'
          return (
            <div key={d}
              className={`h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${cls} ${isToday ? 'ring-2 ring-violet-500 ring-offset-1' : ''}`}>
              {d}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" /> Half day</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" /> Absent</span>
      </div>
    </div>
  )
}
