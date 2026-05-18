/**
 * /chat/[id] — Individual conversation with real-time messages
 */
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ChatRoom from './ChatRoom'

export const dynamic = 'force-dynamic'

export default async function ChatPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch conversation + participants
  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id, resident_id, worker_id, job_application_id, hire_request_id,
      resident:profiles!conversations_resident_id_fkey(id, full_name),
      worker:workers!conversations_worker_id_fkey(id, full_name, specialty, auth_id)
    `)
    .eq('id', params.id)
    .single()

  if (!conv) notFound()

  // Verify user is a participant
  const isResident = conv.resident_id === user.id
  const isWorker   = (conv.worker as any)?.auth_id === user.id
  if (!isResident && !isWorker) notFound()

  // Fetch initial messages
  const { data: initialMessages } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at, is_read')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })

  // Mark messages as read on open (clears nav badge)
  await supabase.from('messages')
    .update({ is_read: true })
    .eq('conversation_id', params.id)
    .neq('sender_id', user.id)

  // Fetch the most-relevant job application for this chat.
  // We independently query for any PENDING application from this worker on
  // this resident's jobs, so switching jobs doesn't break the accept/decline flow.
  const workerDbId    = (conv.worker as any)?.id ?? null
  const convResidentId = (conv as any).resident_id as string

  let applicationId:     string | null = null
  let applicationStatus: string | null = null
  let applicationJobTitle: string | null = null

  if (workerDbId && convResidentId) {
    // Step 1: get all job posting IDs by this resident
    const { data: residentJobs } = await supabase
      .from('job_postings')
      .select('id, specialty, title')
      .eq('employer_id', convResidentId)
    const jobMap = new Map((residentJobs ?? []).map(j => [j.id, j]))
    const jobIds = [...jobMap.keys()]

    if (jobIds.length > 0) {
      // Step 2: find the newest PENDING application from this worker
      const { data: pendingApp } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id')
        .eq('worker_id', workerDbId)
        .in('job_posting_id', jobIds)
        .eq('status', 'pending')
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pendingApp) {
        applicationId     = pendingApp.id
        applicationStatus = 'pending'
        const job = jobMap.get(pendingApp.job_posting_id)
        applicationJobTitle = job?.title ?? job?.specialty?.replace(/_/g, ' ') ?? null
      }
    }
  }

  // Fallback: use conversation's stored application (for accepted/rejected display)
  if (!applicationId) {
    const convAppId: string | null = (conv as any).job_application_id ?? null
    if (convAppId) {
      const { data: app } = await supabase
        .from('job_applications')
        .select('status')
        .eq('id', convAppId)
        .single()
      applicationId     = convAppId
      applicationStatus = app?.status ?? null
    }
  }

  // Fetch hire request details (worker accepts from chat)
  const hireRequestId: string | null = (conv as any).hire_request_id ?? null
  let hireRequestStatus: string | null = null
  let hireRequestOfferedSalary: number | null = null
  let hireRequestSpecialty: string | null = null
  if (hireRequestId) {
    const { data: hr } = await supabase
      .from('hire_requests')
      .select('status, offered_salary, specialty')
      .eq('id', hireRequestId)
      .single()
    hireRequestStatus        = hr?.status ?? null
    hireRequestOfferedSalary = hr?.offered_salary ?? null
    hireRequestSpecialty     = hr?.specialty ?? null
  }

  // Fetch active engagement between this resident + worker
  let engagementId: string | null = null
  if ((conv as any).resident_id && (conv as any).worker_id) {
    const { data: eng } = await supabase
      .from('engagements')
      .select('id')
      .eq('employer_id', (conv as any).resident_id)
      .eq('worker_id', (conv as any).worker_id)
      .eq('status', 'active')
      .maybeSingle()
    engagementId = eng?.id ?? null
  }

  const otherName = isResident
    ? (conv.worker as any)?.full_name ?? 'Helper'
    : (conv.resident as any)?.full_name ?? 'Resident'

  const otherRole = isResident
    ? ((conv.worker as any)?.specialty ?? 'helper').replace(/_/g, ' ')
    : 'resident'

  return (
    <ChatRoom
      conversationId={params.id}
      currentUserId={user.id}
      initialMessages={initialMessages ?? []}
      otherName={otherName}
      otherRole={otherRole}
      isResident={isResident}
      applicationId={applicationId}
      applicationStatus={applicationStatus}
      applicationJobTitle={applicationJobTitle}
      engagementId={engagementId}
      workerId={(conv.worker as any)?.id ?? null}
      residentId={(conv as any).resident_id ?? null}
      hireRequestId={hireRequestId}
      hireRequestStatus={hireRequestStatus}
      hireRequestOfferedSalary={hireRequestOfferedSalary}
      hireRequestSpecialty={hireRequestSpecialty}
    />
  )
}
