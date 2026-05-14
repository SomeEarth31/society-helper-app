'use client'
/**
 * Real-time chat room — Supabase Realtime subscription on messages.
 */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

export default function ChatRoom({
  conversationId,
  currentUserId,
  initialMessages,
  otherName,
  otherRole,
}: {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
  otherName: string
  otherRole: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        // Mark as read if from other person
        if (newMsg.sender_id !== currentUserId) {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    setText('')

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
    })

    setSending(false)
    inputRef.current?.focus()
  }

  const initials = otherName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  // Group messages by date
  function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = []
  messages.forEach(m => {
    const dateLabel = formatDate(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === dateLabel) last.msgs.push(m)
    else grouped.push({ date: dateLabel, msgs: [m] })
  })

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 pt-12 pb-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={() => router.back()}
          className="h-9 w-9 flex items-center justify-center text-slate-500 active:opacity-60 shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="h-10 w-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-black shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-[15px] leading-tight">{otherName}</p>
          <p className="text-[11px] text-slate-400 capitalize">{otherRole}</p>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {grouped.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400 text-center">
              Send a message to start the conversation with {otherName}
            </p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center justify-center mb-3">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>

            <div className="space-y-1.5">
              {group.msgs.map((m, i) => {
                const isMine = m.sender_id === currentUserId
                const isFirst = i === 0 || group.msgs[i - 1].sender_id !== m.sender_id

                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                        isMine
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : 'bg-white border border-slate-100 text-slate-900 shadow-sm rounded-bl-sm'
                      }`}>
                        {m.content}
                      </div>
                      {/* Time — show for last in a run */}
                      {(i === group.msgs.length - 1 || group.msgs[i + 1]?.sender_id !== m.sender_id) && (
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {formatTime(m.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend}
        className="bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-3 pb-safe shrink-0">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none focus:border-violet-500 focus:bg-white transition"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="h-12 w-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-200 active:scale-95 transition disabled:opacity-40 shrink-0">
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  )
}
