'use client'
/**
 * AttendanceToggle — quick-mark widget for today's attendance.
 * Optimistic UI + Supabase upsert/delete.
 */
import { useOptimistic, useTransition } from 'react'
import { Check, X, RotateCcw, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Status = 'present' | 'half_day' | 'absent' | null

export default function AttendanceToggle({
  engagementId, date, initial,
}: { engagementId: string; date: string; initial: Status }) {
  const [pending, start] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic<Status>(initial)
  const router = useRouter()

  const mark = (next: Status) => {
    setOptimistic(next)
    start(async () => {
      const supabase = createClient()
      if (next === null) {
        await supabase.from('attendance').delete()
          .eq('engagement_id', engagementId).eq('date', date)
      } else {
        await supabase.from('attendance').upsert(
          { engagement_id: engagementId, date, status: next },
          { onConflict: 'engagement_id,date' },
        )
      }
      router.refresh()
    })
  }

  return (
    <div
      className={`inline-flex items-center rounded-2xl bg-slate-100 p-1 gap-0.5 transition-opacity ${pending ? 'opacity-60' : ''}`}
      aria-busy={pending}
    >
      <ToggleBtn
        active={optimistic === 'present'}
        onClick={() => mark(optimistic === 'present' ? null : 'present')}
        label="Present"
        activeClass="bg-emerald-500 text-white shadow-sm"
        icon={<Check size={13} strokeWidth={2.5} />}
      />
      <ToggleBtn
        active={optimistic === 'half_day'}
        onClick={() => mark(optimistic === 'half_day' ? null : 'half_day')}
        label="Half Day"
        activeClass="bg-amber-400 text-white shadow-sm"
        icon={<Minus size={13} strokeWidth={2.5} />}
      />
      <ToggleBtn
        active={optimistic === 'absent'}
        onClick={() => mark(optimistic === 'absent' ? null : 'absent')}
        label="Absent"
        activeClass="bg-rose-500 text-white shadow-sm"
        icon={<X size={13} strokeWidth={2.5} />}
      />
      {optimistic !== null && (
        <ToggleBtn
          active={false}
          onClick={() => mark(null)}
          label="Clear"
          activeClass=""
          icon={<RotateCcw size={11} strokeWidth={2} />}
        />
      )}
    </div>
  )
}

function ToggleBtn({
  active, onClick, label, activeClass, icon,
}: {
  active: boolean; onClick: () => void; label: string
  activeClass: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
        active
          ? activeClass
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
      }`}
    >
      {icon}
      <span className="text-[11px]">{label}</span>
    </button>
  )
}
