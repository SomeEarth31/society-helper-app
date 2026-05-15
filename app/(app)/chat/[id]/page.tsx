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

  // Fetch application status (resident accepts applicants from chat)
  const applicationId: string | null = (conv as any).job_application_id ?? null
  let applicationStatus: string | null = null
  if (applicationId) {
    const { data: app } = await supabase
      .from('job_applications')
      .select('status')
      .eq('id', applicationId)
      .single()
    applicationStatus = app?.status ?? null
  }

  // Fetch hire request details (worker accepts from chat)
  const hireRequestId: string | null = (conv as any).hire_request_id ?? null
  let hireRequestStatus: string | null = null
  let hireRequestOfferedSalary: number | null = null
  if (hireRequestId) {
    const { data: hr } = await supabase
      .from('hire_requests')
      .select('status, offered_salary')
      .eq('id', hireRequestId)
      .single()
    hireRequestStatus       = hr?.status ?? null
    hireRequestOfferedSalary = hr?.offered_salary ?? null
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
      engagementId={engagementId}
      workerId={(conv.worker as any)?.id ?? null}
      residentId={(conv as any).resident_id ?? null}
      hireRequestId={hireRequestId}
      hireRequestStatus={hireRequestStatus}
      hireRequestOfferedSalary={hireRequestOfferedSalary}
    />
  )
}
