'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star, Loader2 } from 'lucide-react'

/* ── Shared helpers ──────────────────────────────────────────── */

function RatingDisplay({ score, count }: { score: number | null; count: number }) {
  if (count === 0 || score === null) {
    return <span className="text-xs text-slate-400 font-medium">Unrated</span>
  }
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
      <Star size={11} className="fill-amber-400 text-amber-400" />
      {score.toFixed(1)}
      <span className="text-slate-400 font-normal">
        ({count} {count === 1 ? 'vote' : 'votes'})
      </span>
    </span>
  )
}

function StarPicker({
  onSelect,
  disabled,
}: {
  onSelect: (n: number) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onSelect(n)}
          className="p-1 disabled:opacity-60 transition-transform active:scale-90"
        >
          <Star
            size={22}
            className={`transition ${
              n <= hovered ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

/* ── RateResidentButton ──────────────────────────────────────── */

export function RateResidentButton({
  engagementId,
  workerId,
  residentId,
  trustScore,
  reviewCount,
}: {
  engagementId: string
  workerId: string
  residentId: string
  trustScore: number | null
  reviewCount: number
}) {
  const supabase = createClient()
  const router   = useRouter()
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [localScore, setLocalScore] = useState<number | null>(null)

  async function handleRate(rating: number) {
    setSaving(true)
    const { error } = await supabase.from('resident_reviews').insert({
      engagement_id: engagementId,
      worker_id:     workerId,
      resident_id:   residentId,
      rating,
    })
    setSaving(false)
    if (error) { console.error(error.message); return }
    setLocalScore(rating)
    setDone(true)
    setOpen(false)
    router.refresh()
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 pt-2">
        <span className="text-xs text-slate-500">Your rating:</span>
        <RatingDisplay score={localScore} count={1} />
      </div>
    )
  }

  return (
    <div className="pt-2 space-y-2">
      <div className="flex items-center justify-between">
        <RatingDisplay score={trustScore} count={reviewCount} />
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100"
          >
            Rate Resident
          </button>
        )}
      </div>
      {open && (
        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-3 py-2.5 border border-slate-200">
          <span className="text-xs text-slate-500 shrink-0">Tap to rate:</span>
          {saving
            ? <Loader2 size={16} className="animate-spin text-slate-400" />
            : <StarPicker onSelect={handleRate} disabled={saving} />
          }
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto text-xs text-slate-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

/* ── RateWorkerButton ────────────────────────────────────────── */

export function RateWorkerButton({
  engagementId,
  workerId,
  reviewerId,
  workerName,
  trustScore,
  reviewCount,
}: {
  engagementId: string
  workerId: string
  reviewerId: string
  workerName: string
  trustScore: number | null
  reviewCount: number
}) {
  const supabase = createClient()
  const router   = useRouter()
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [localScore, setLocalScore] = useState<number | null>(null)

  async function handleRate(rating: number) {
    setSaving(true)
    const { error } = await supabase.from('reviews').insert({
      engagement_id: engagementId,
      worker_id:     workerId,
      reviewer_id:   reviewerId,
      rating,
    })
    setSaving(false)
    if (error) { console.error(error.message); return }
    setLocalScore(rating)
    setDone(true)
    setOpen(false)
    router.refresh()
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-slate-500">Your rating:</span>
        <RatingDisplay score={localScore} count={1} />
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <RatingDisplay score={trustScore} count={reviewCount} />
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100"
          >
            Rate {workerName.split(' ')[0]}
          </button>
        )}
      </div>
      {open && (
        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-3 py-2.5 border border-slate-200">
          <span className="text-xs text-slate-500 shrink-0">Tap to rate:</span>
          {saving
            ? <Loader2 size={16} className="animate-spin text-slate-400" />
            : <StarPicker onSelect={handleRate} disabled={saving} />
          }
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto text-xs text-slate-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Standalone RatingBadge (for display-only use) ──────────── */
export function RatingBadge({ score, count }: { score: number | null; count: number }) {
  return <RatingDisplay score={score} count={count} />
}
