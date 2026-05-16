'use client'
/**
 * DeleteJobButton — lets residents delete (cancel) their own job postings.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteJobButton({ jobId }: { jobId: string }) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await supabase.from('job_postings')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl active:scale-95 transition disabled:opacity-40 flex items-center gap-1"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs font-bold text-slate-500 px-2 py-1.5 rounded-xl active:scale-95 transition"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs font-bold text-slate-400 px-3 py-2 rounded-xl hover:text-red-500 hover:bg-red-50 active:scale-95 transition"
    >
      <Trash2 size={13} /> Delete
    </button>
  )
}
