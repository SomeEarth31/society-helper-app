'use client'
/**
 * EmployerEngagementCard — worker "Active Engagements" card.
 * Each role links to /engagements/[id] for the full detail view.
 */
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
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
  const initials = (employer.full_name ?? 'R').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const firstEng = engagements[0]

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

      {/* ── Per-engagement rows (each links to /engagements/[id]) ── */}
      {engagements.map((e, idx) => {
        const daysPresent = e.attendance.reduce((s, a) =>
          s + (a.status === 'present' ? 1 : a.status === 'half_day' ? 0.5 : 0), 0)
        const role = (e.service_type ?? '').replace(/_/g, ' ') || 'Helper'
        return (
          <Link
            key={e.id}
            href={`/engagements/${e.id}`}
            className={`flex items-center justify-between px-4 py-3 border-t ${idx === 0 ? 'border-slate-100' : 'border-slate-200'} bg-slate-50 active:opacity-70`}
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 capitalize shrink-0">{role}</span>
              <span className="text-xs text-slate-500">
                {daysPresent} / {daysInMonth} days present
              </span>
            </div>
            <ArrowRight size={15} className="text-slate-400 shrink-0 ml-2" />
          </Link>
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
