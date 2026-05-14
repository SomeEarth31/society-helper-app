/**
 * /chat — List of all conversations for the current user
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChatListPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const { data: workerRow } = await supabase
    .from('workers').select('id').eq('auth_id', user.id).maybeSingle()

  // Fetch conversations where user is a participant
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, last_message_at,
      resident:profiles!conversations_resident_id_fkey(id, full_name),
      worker:workers!conversations_worker_id_fkey(id, full_name, specialty),
      messages(content, created_at, is_read, sender_id)
    `)
    .or(
      profile?.role === 'worker'
        ? `worker_id.eq.${workerRow?.id ?? '00000000-0000-0000-0000-000000000000'}`
        : `resident_id.eq.${user.id}`
    )
    .order('last_message_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white px-5 pt-14 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-slate-900">Messages</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your conversations</p>
      </header>

      <div className="px-5 mt-5">
        {(!conversations || conversations.length === 0) ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <MessageCircle size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-500">No conversations yet</p>
            <p className="text-xs text-slate-400 mt-1">
              {profile?.role === 'worker'
                ? 'Accept a hire request or job application to start chatting'
                : 'Hire a worker or accept an application to start chatting'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversations.map((conv: any) => {
              const isWorker   = profile?.role === 'worker'
              const otherName  = isWorker
                ? conv.resident?.full_name ?? 'Resident'
                : conv.worker?.full_name ?? 'Worker'
              const otherRole  = isWorker ? 'Resident' : (conv.worker?.specialty ?? 'Helper').replace(/_/g, ' ')
              const initials   = otherName.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()

              // Sort messages to get latest
              const msgs = [...(conv.messages ?? [])].sort(
                (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              const lastMsg   = msgs[0]
              const unreadCnt = msgs.filter((m: any) => !m.is_read && m.sender_id !== user.id).length

              return (
                <li key={conv.id}>
                  <Link href={`/chat/${conv.id}`}
                    className="flex items-center gap-3.5 bg-white rounded-3xl border border-slate-100 shadow-sm px-4 py-3.5 active:bg-slate-50 transition">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 ${
                      isWorker ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[15px] truncate ${unreadCnt > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-900'}`}>
                          {otherName}
                        </p>
                        {lastMsg && (
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {new Date(lastMsg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${unreadCnt > 0 ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                          {lastMsg ? lastMsg.content : `${otherRole} · Start the conversation`}
                        </p>
                        {unreadCnt > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center px-1">
                            {unreadCnt}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
