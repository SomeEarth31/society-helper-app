'use client'
/**
 * Compact apply button for "Openings near you" cards on WorkerDashboard.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function QuickApplyButton({
  jobId,
  workerId,
}: {
  jobId: string
  workerId: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const [state, setState] = useState<'idle' | 'loading' | 'applied'>('idle')

  async function handleApply() {
    setState('loading')
    const { data } = await supabase.from('job_applications').upsert({
      job_posting_id: jobId,
      worker_id: workerId,
      status: 'pending',
      resolved_at: null,
    }, { onConflict: 'job_posting_id,worker_id' }).select('id').single()

    setState(data ? 'applied' : 'idle')
    router.refresh()
  }

  if (state === 'applied') {
    return (
      <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600 h-9">
        <CheckCircle2 size={15} /> Applied
      </div>
    )
  }

  return (
    <button
      onClick={handleApply}
      disabled={state === 'loading'}
      className="w-full h-9 rounded-2xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-40"
    >
      {state === 'loading'
        ? <Loader2 size={13} className="animate-spin" />
        : 'Apply →'}
    </button>
  )
}
