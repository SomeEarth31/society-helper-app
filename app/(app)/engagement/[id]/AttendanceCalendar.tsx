'use client'
/**
 * AttendanceCalendar — month grid for tap-to-mark attendance.
 *
 * Tapping a day cycles through:
 *   unmarked → present → half_day → absent → unmarked
 *
 * Updates are optimistic: we flip local state immediately, then
 * call the `markAttendance` server action. If the server action
 * errors, we revert and surface a small inline message.
 */
import { useOptimistic, useState, useTransition } from 'react'
import { markAttendance, type AttendanceStatus } from './actions'

type Status = AttendanceStatus | null

interface Props {
  engagementId: string
  year: number
  month: number                            // 0-indexed (Jan = 0)
  initial: Record<string, AttendanceStatus> // YYYY-MM-DD → status
}

const ORDER: Status[] = [null, 'present', 'half_day', 'absent']
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function AttendanceCalendar({
  engagementId,
  year,
  month,
  initial,
}: Props) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  // Optimistic map — derives from the server-provided initial state.
  const [optimistic, applyPatch] = useOptimistic<
    Record<string, Status>,
    { date: string; status: Status }
  >(initial, (state, patch) => ({ ...state, [patch.date]: patch.status }))

  // Grid math.
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const daysInMonth = last.getDate()
  const leadingBlanks = first.getDay() // 0 = Sun … 6 = Sat
  const todayStr = new Date().toISOString().slice(0, 10)

  const cycle = (current: Status): Status => {
    const idx = ORDER.indexOf(current ?? null)
    return ORDER[(idx + 1) % ORDER.length]
  }

  const onTap = (date: string) => {
    setErr(null)
    const next = cycle(optimistic[date] ?? null)
    applyPatch({ date, status: next })
    start(async () => {
      const res = await markAttendance(engagementId, date, next)
      if (!res.ok) {
        setErr(res.error)
        // Best-effort revert: restore previous value.
        applyPatch({ date, status: optimistic[date] ?? null })
      }
    })
  }

  // Build the cells: leading blanks, then 1..N.
  const cells: Array<{ key: string; date: string | null; day: number | null }> = []
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ key: `b${i}`, date: null, day: null })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ key: date, date, day: d })
  }

  return (
    <div aria-busy={pending}>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="text-center text-[10px] font-semibold uppercase text-neutral-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map(cell => {
          if (!cell.date || !cell.day) {
            return <div key={cell.key} />
          }
          const status = optimistic[cell.date] ?? null
          const isToday = cell.date === todayStr
          return (
            <button
              key={cell.key}
              onClick={() => onTap(cell.date!)}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition active:scale-95 ${cellClasses(status)} ${
                isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
              }`}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {err && (
        <p className="mt-3 text-center text-xs text-rose-600">{err}</p>
      )}
    </div>
  )
}

function cellClasses(status: Status): string {
  switch (status) {
    case 'present':
      return 'bg-emerald-500 text-white'
    case 'half_day':
      return 'bg-amber-400 text-white'
    case 'absent':
      return 'bg-rose-500 text-white'
    default:
      return 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
  }
}
