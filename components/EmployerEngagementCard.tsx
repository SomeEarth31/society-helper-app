'use client'
/**
 * EmployerEngagementCard — worker "Active Engagements" card.
 * Groups multiple roles under the same resident into one card.
 * Each role has a collapsible read-only attendance calendar.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import Link from 'next/link'
import EndEngagementButton from './EndEngagementButton'
import { RateResidentButton } from './RateButtons'

export type EmpEngData = {
  id: string
  monthly_salary: number
  service_type: string | null
  attendance: { date: string; status: string }[]
}

export type EmployerInfo = {
  id: string
  full_name: string | null
  flat_number: string | null
  trust_score: number | null
  reviewCount: number
  societyName: string | null
}

type Props = {
  workerId: string
  employer: EmployerInfo
  engagements: EmpEngData[]
  daysInMonth: number
  startStr: string
  todayStr: string
}

export default function EmployerEngagementCard({
  workerId, employer, engagements, daysInMonth, startStr, todayStr,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(engagements.map(e => [e.id, engagements.length === 1]))
  )
  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const initials  = (employer.full_name ?? 'R').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const firstEng  = engagements[0]

  return (
    <li className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {/* ── Employer header ── */}
      <div className="flex items-center gap-3.5 p-4">
        <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-[15px] truncate">{employer.full_name ?? 'Resident'}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 flex-wrap">
            <MapPin size={11} />
            {employer.flat_number ? `Flat ${employer.flat_number}` : '—'}
            {employer.societyName && <> · {employer.societyName}</>}
          </p>
          <p className="mt-0.5 text-xs">
            {employer.trust_score != null
              ? <span className="text-amber-600 font-bold">★ {employer.trust_score.toFixed(1)} <span className="text-slate-400 font-normal">({employer.reviewCount} votes)</span></span>
              : <span className="text-slate-400">Unrated resident</span>
            }
          </p>
          {engagements.length > 1 && (
            <p className="text-xs text-violet-600 font-semibold mt-0.5 capitalize">
              {engagements.map(e => (e.service_type ?? '').replace(/_/g, ' ')).filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly</p>
          {engagements.map(e => (
            <p key={e.id} className="text-sm font-black text-slate-900">
              ₹{e.monthly_salary.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      </div>

      {/* ── Per-engagement accordion sections ── */}
      {engagements.map((e, idx) => {
        const daysPresent = e.attendance.filter(a => a.status === 'present').length
        const role        = (e.service_type ?? '').replace(/_/g, ' ') || 'Helper'
        const isOpen      = expanded[e.id]

        return (
          <div key={e.id} className={`border-t ${idx === 0 ? 'border-slate-100' : 'border-slate-200'}`}>
            <button
              onClick={() => toggle(e.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 active:opacity-70"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {engagements.length > 1 && (
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 capitalize">{role}</span>
                )}
                <span className="text-xs text-slate-500 capitalize">
                  {engagements.length === 1 && <span className="font-semibold">{role} · </span>}
                  {daysPresent} / {daysInMonth} days present
                </span>
              </div>
              {isOpen
                ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
                : <ChevronDown size={15} className="text-slate-400 shrink-0" />
              }
            </button>

            {isOpen && (
              <div className="px-4 py-4 bg-slate-50 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {new Date(startStr + 'T00:00:00').toLocaleString('en-IN', { month: 'long', year: 'numeric' })} attendance
                  </p>
                  <AttendanceCalendar attendance={e.attendance} startStr={startStr} daysInMonth={daysInMonth} todayStr={todayStr} />
                </div>
                <EndEngagementButton engagementId={e.id} role="worker" otherName={employer.full_name ?? 'Resident'} />
              </div>
            )}
          </div>
        )
      })}

      {/* ── Actions bar ── */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex gap-2">
        <Link
          href="/chat"
          className="flex-1 text-center py-2.5 bg-white text-slate-600 rounded-2xl text-xs font-bold border border-slate-200 flex items-center justify-center"
        >
          Message
        </Link>
        {employer.id && (
          <RateResidentButton
            engagementId={firstEng.id}
            workerId={workerId}
            residentId={employer.id}
            trustScore={employer.trust_score}
            reviewCount={employer.reviewCount}
          />
        )}
      </div>
    </li>
  )
}

// ── Read-only attendance calendar ─────────────────────────────────────────
function AttendanceCalendar({ attendance, startStr, daysInMonth, todayStr }: {
  attendance: { date: string; status: string }[]
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
    return { d, status: attMap.get(dateStr), isPast: dateStr <= todayStr, isToday: dateStr === todayStr }
  })

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S','M','T','W','T','F','S'].map((l, i) => (
          <span key={i} className="text-[9px] font-bold text-slate-400 text-center">{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDow }).map((_, i) => <div key={`p${i}`} />)}
        {cells.map(({ d, status, isPast, isToday }) => {
          const cls =
            status === 'present'  ? 'bg-emerald-400 text-white' :
            status === 'half_day' ? 'bg-amber-400 text-white' :
            status === 'absent'   ? 'bg-rose-400 text-white' :
            isPast                ? 'bg-slate-200 text-slate-400' :
                                    'bg-slate-100 text-slate-300'
          return (
            <div key={d} className={`h-7 rounded flex items-center justify-center text-[10px] font-bold ${cls} ${isToday ? 'ring-2 ring-emerald-500' : ''}`}>
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
