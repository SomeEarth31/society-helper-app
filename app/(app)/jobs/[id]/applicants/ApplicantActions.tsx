'use client'
/**
 * Accept / Reject applicant.
 * On accept: update status + create engagement + open conversation.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2, MessageCircle } from 'lucide-react'

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
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)

  async function handleAccept() {
    setLoading('accept')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(null); return }

    // 1. Accept the application
    await supabase.from('job_applications')
      .update({ status: 'accepted', resolved_at: new Date().toISOString() })
      .eq('id', applicationId)

    // 2. Get job info for salary
    const { data: job } = await supabase.from('job_postings')
      .select('offered_salary, specialty, title').eq('id', jobPostingId).single()

    // 3. Create engagement
    const { data: eng } = await supabase.from('engagements').insert({
      employer_id: user.id,
      worker_id: workerId,
      job_application_id: applicationId,
      monthly_salary: job?.offered_salary ?? 0,
      service_type: job?.specialty ?? null,
      status: 'active',
    }).select().single()

    // 4. Create or fetch conversation
    const { data: conv } = await supabase.from('conversations')
      .upsert({
        resident_id: user.id,
        worker_id: workerId,
        job_application_id: applicationId,
      }, { onConflict: 'resident_id,worker_id' })
      .select().single()

    setLoading(null)
    if (conv) router.push(`/chat/${conv.id}`)
    else router.push('/jobs')
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
      <button onClick={handleAccept} disabled={!!loading}
        className="flex-1 h-11 rounded-2xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 transition disabled:opacity-40">
        {loading === 'accept' ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> Accept & Chat</>}
      </button>
    </div>
  )
}
