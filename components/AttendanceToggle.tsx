'use client'
/**
 * AttendanceToggle — single-day quick-mark widget shown on the dashboard.
 * For full-month calendar editing, see components/AttendanceCalendar.tsx.
 */
import { useOptimistic, useTransition } from 'react'
import { Check, X, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'present' | 'absent' | null

interface Props {
  engagementId: string
  date: string                 // YYYY-MM-DD (usually today)
  initial: Status
}

export default function AttendanceToggle({ engagementId, date, initial }: Props) {
  const [pending, start] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic<Status>(initial)

  const mark = (next: Status) => {
    setOptimistic(next)
    start(async () => {
      const supabase = createClient()
      if (next === null) {
        await supabase.from('attendance').delete()
          .eq('engagement_id', engagementId).eq('date', date)
      } else {
        // Upsert — one row per (engagement, date), enforced by unique constraint.
        await supabase.from('attendance').upsert(
          { engagement_id: engagementId, date, status: next },
          { onConflict: 'engagement_id,date' }
        )
      }
    })
  }

  return (
    <div className="inline-flex rounded-full bg-neutral-100 p-0.5" aria-busy={pending}>
      <Btn active={optimistic === 'present'} onClick={() => mark('present')}
           color="emerald" Icon={Check} label="Present" />
      <Btn active={optimistic === 'absent'} onClick={() => mark('absent')}
           color="rose" Icon={X} label="Absent" />
      <Btn active={optimistic === null} onClick={() => mark(null)}
           color="neutral" Icon={Circle} label="Clear" />
    </div>
  )
}

function Btn({ active, onClick, color, Icon, label }: {
  active: boolean
  onClick: () => void
  color: 'emerald' | 'rose' | 'neutral'
  Icon: React.ComponentType<{ size?: number }>
  label: string
}) {
  const palette = {
    emerald: 'bg-emerald-500 text-white',
    rose:    'bg-rose-500 text-white',
    neutral: 'bg-neutral-300 text-neutral-700',
  }[color]
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
        active ? palette : 'text-neutral-400 hover:text-neutral-600'
      }`}
    >
      <Icon size={14} />
    </button>
  )
}
