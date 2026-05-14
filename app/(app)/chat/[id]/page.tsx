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
      id, resident_id,
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

  // Mark messages as read
  await supabase.from('messages')
    .update({ is_read: true })
    .eq('conversation_id', params.id)
    .neq('sender_id', user.id)

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
    />
  )
}
