'use client'
/**
 * HelperEngagementCard — resident "My Helpers" card with per-role attendance accordion.
 * Each engagement (role) is collapsible; shows the full-month attendance calendar.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import AttendanceToggle from './AttendanceToggle'
import PaymentButton from './PaymentButton'
import EndEngagementButton from './EndEngagementButton'
import { RateWorkerButton } from './RateButtons'
import { computeDues } from '@/lib/upi'

export type EngCardData = {
  id: string
  monthly_salary: number
  service_type: string | null
  workerSpecialty: string
  attendance: { date: string; status: string }[]
}

type Props = {
  workerId: string
  workerName: string
  workerPhotoUrl: string | null
  workerTrustScore: number | null
  reviewCount: number
  engagements: EngCardData[]
  daysInMonth: number
  todayStr: string
  startStr: string
  endStr: string
  userId: string
}

export default function HelperEngagementCard({
  workerId, workerName, workerPhotoUrl, workerTrustScore,
  reviewCount, engagements, daysInMonth, todayStr, startStr, endStr, userId,
}: Props) {
  // Default: expanded if only one engagement, collapsed if multiple
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(engagements.map(e => [e.id, engagements.length === 1]))
  )
  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const initials = workerName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  // Compute per-engagement stats from attendance
  const stats = engagements.map(e => {
    const att = e.attendance
    const daysWorked = att.reduce((s, a) => s + (a.status === 'present' ? 1 : a.status === 'half_day' ? 0.5 : 0), 0)
    const todayStatus = att.find(a => a.date === todayStr)?.status as 'present' | 'absent' | null ?? null
    const dues = computeDues(e.monthly_salary, daysWorked, daysInMonth)
    return { daysWorked, todayStatus, dues }
  })

  const totalDues = stats.reduce((s, st) => s + st.dues, 0)
  const firstEng  = engagements[0]

  return (
    <li className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {/* ── Worker header ── */}
      <div className="flex items-center gap-3.5 p-4">
        {workerPhotoUrl ? (
          <img src={workerPhotoUrl} alt={workerName} className="h-12 w-12 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-black shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate text-[15px]">{workerName}</p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">
            {engagements.map(e => (e.service_type ?? e.workerSpecialty).replace(/_/g, ' ')).join(' · ')}
          </p>
          {workerTrustScore != null
            ? <span className="text-xs text-amber-500 font-semibold">★ {workerTrustScore.toFixed(1)}</span>
            : <span className="text-xs text-slate-400">Unrated</span>
          }
        </div>
        {engagements.length > 1 && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Total owed</p>
            <p className="text-sm font-black text-slate-900">₹{totalDues.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      {/* ── Per-engagement accordion sections ── */}
      {engagements.map((e, idx) => {
        const { daysWorked, todayStatus, dues } = stats[idx]
        const role   = (e.service_type ?? e.workerSpecialty).replace(/_/g, ' ')
        const isOpen = expanded[e.id]

        return (
          <div key={e.id} className={`border-t ${idx === 0 ? 'border-slate-100' : 'border-slate-200'}`}>
            {/* Accordion toggle row */}
            <button
              onClick={() => toggle(e.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 active:opacity-70"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {engagements.length > 1 && (
                  <span className="text-[11px] font-bold uppercase tracking-widest text-violet-500 capitalize">{role}</span>
                )}
                <span className="text-xs text-slate-500">
                  {daysWorked} / {daysInMonth} days · ₹{dues.toLocaleString('en-IN')}
                </span>
              </div>
              {isOpen
                ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
                : <ChevronDown size={15} className="text-slate-400 shrink-0" />
              }
            </button>

            {/* Expanded body */}
            {isOpen && (
              <div className="px-4 py-4 bg-slate-50 space-y-4">
                {/* Month attendance calendar */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {new Date(startStr + 'T00:00:00').toLocaleString('en-IN', { month: 'long', year: 'numeric' })} attendance
                  </p>
                  <MonthCalendar attendance={e.attendance} startStr={startStr} daysInMonth={daysInMonth} todayStr={todayStr} />
                </div>

                {/* Today's attendance toggle */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Today</p>
                  <AttendanceToggle engagementId={e.id} date={todayStr} initial={todayStatus} />
                </div>

                {/* Payment */}
                <PaymentButton
                  engagementId={e.id}
                  amount={dues}
                  daysWorked={daysWorked}
                  periodStart={startStr}
                  periodEnd={endStr}
                  workerName={workerName}
                />

                {/* End engagement */}
                <EndEngagementButton engagementId={e.id} role="resident" otherName={workerName} />
              </div>
            )}
          </div>
        )
      })}

      {/* ── Rate button (once per worker) ── */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3">
        <RateWorkerButton
          engagementId={firstEng.id}
          workerId={workerId}
          reviewerId={userId}
          workerName={workerName}
          trustScore={workerTrustScore}
          reviewCount={reviewCount}
        />
      </div>
    </li>
  )
}

// ── Month attendance read-only calendar ────────────────────────────────────
function MonthCalendar({ attendance, startStr, daysInMonth, todayStr }: {
  attendance: { date: string; status: string }[]
  startStr: string
  daysInMonth: number
  todayStr: string
}) {
  const attMap    = new Map(attendance.map(a => [a.date, a.status]))
  const startDow  = new Date(startStr + 'T00:00:00').getDay() // 0 = Sun
  const prefix    = startStr.slice(0, 7) // "YYYY-MM"

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const d       = i + 1
    const dateStr = `${prefix}-${String(d).padStart(2, '0')}`
    const status  = attMap.get(dateStr)
    return { d, dateStr, status, isPast: dateStr <= todayStr, isToday: dateStr === todayStr }
  })

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S','M','T','W','T','F','S'].map((l, i) => (
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
            <div key={d} className={`h-7 rounded flex items-center justify-center text-[10px] font-bold ${cls} ${isToday ? 'ring-2 ring-violet-500' : ''}`}>
              {d}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Present</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Half day</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400 inline-block" /> Absent</span>
      </div>
    </div>
  )
}
