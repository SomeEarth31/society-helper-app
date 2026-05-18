'use client'
/**
 * HelperEngagementCard — resident "My Helpers" card.
 * Each role shows as a compact row linking to /engagements/[id].
 */
import Link from 'next/link'
import { ArrowRight, IndianRupee } from 'lucide-react'
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
  const initials = workerName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  // Compute per-engagement stats
  const stats = engagements.map(e => {
    const daysWorked = e.attendance.reduce((s, a) =>
      s + (a.status === 'present' ? 1 : a.status === 'half_day' ? 0.5 : 0), 0)
    const dues = computeDues(e.monthly_salary, daysWorked, daysInMonth)
    return { daysWorked, dues }
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
            <p className="text-sm font-black text-slate-900 flex items-center gap-0.5 justify-end">
              <IndianRupee size={11} />{totalDues.toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>

      {/* ── Per-engagement rows ── */}
      {engagements.map((e, idx) => {
        const { daysWorked, dues } = stats[idx]
        const role = (e.service_type ?? e.workerSpecialty).replace(/_/g, ' ')
        return (
          <Link
            key={e.id}
            href={`/engagements/${e.id}`}
            className={`flex items-center justify-between px-4 py-3 border-t ${idx === 0 ? 'border-slate-100' : 'border-slate-200'} bg-slate-50 active:opacity-70`}
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-600 capitalize shrink-0">{role}</span>
              <span className="text-xs text-slate-500">
                {daysWorked} / {daysInMonth} days · <span className="font-bold text-slate-700">₹{dues.toLocaleString('en-IN')}</span>
              </span>
            </div>
            <ArrowRight size={15} className="text-slate-400 shrink-0 ml-2" />
          </Link>
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
