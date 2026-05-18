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

    // Check if conversation already exists, then update or insert
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('resident_id', user.id)
      .eq('worker_id', workerId)
      .maybeSingle()

    let convId: string | null = null
    if (existing) {
      // Always update job_application_id to this new application
      await supabase.from('conversations')
        .update({ job_application_id: applicationId })
        .eq('id', existing.id)
      convId = existing.id
    } else {
      const { data: conv } = await supabase.from('conversations')
        .insert({ resident_id: user.id, worker_id: workerId, job_application_id: applicationId })
        .select('id').single()
      convId = conv?.id ?? null
    }

    setLoading(null)
    if (convId) router.push(`/chat/${convId}`)
    else router.push('/chat')
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
