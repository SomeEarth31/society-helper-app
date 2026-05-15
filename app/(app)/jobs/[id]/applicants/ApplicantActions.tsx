'use client'
/**
 * Applicant action buttons.
 * "Chat" opens / creates conversation without auto-accepting.
 * Accept / Decline happen inside the chat room.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { XCircle, Loader2, MessageCircle } from 'lucide-react'

export default function ApplicantActions({
  applicationId,
  workerId,
  jobPostingId,
}: {
  applicationId: string
  workerId: string
  jobPostingId: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'chat' | 'reject' | null>(null)

  async function handleChat() {
    setLoading('chat')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(null); return }

    // Create or fetch conversation (upsert on resident+worker unique pair)
    const { data: conv } = await supabase.from('conversations')
      .upsert({
        resident_id: user.id,
        worker_id: workerId,
        job_application_id: applicationId,
      }, { onConflict: 'resident_id,worker_id' })
      .select().single()

    setLoading(null)
    if (conv) router.push(`/chat/${conv.id}`)
  }

  async function handleReject() {
    setLoading('reject')
    await supabase.from('job_applications')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', applicationId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2 mt-1">
      <button onClick={handleReject} disabled={!!loading}
        className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40">
        {loading === 'reject' ? <Loader2 size={15} className="animate-spin" /> : <><XCircle size={15} /> Decline</>}
      </button>
      <button onClick={handleChat} disabled={!!loading}
        className="flex-1 h-11 rounded-2xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 transition disabled:opacity-40">
        {loading === 'chat' ? <Loader2 size={15} className="animate-spin" /> : <><MessageCircle size={15} /> Chat</>}
      </button>
    </div>
  )
}
