'use client'
/**
 * Real-time chat room — Supabase Realtime subscription on messages.
 * Residents: Accept / Decline job applicants.
 * Workers: Accept / Decline hire requests from residents.
 */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

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
  isResident,
  applicationId,
  applicationStatus: initialAppStatus,
  engagementId: initialEngagementId,
  workerId,
  residentId,
  hireRequestId,
  hireRequestStatus: initialHireStatus,
  hireRequestOfferedSalary,
  hireRequestSpecialty,
}: {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
  otherName: string
  otherRole: string
  isResident: boolean
  applicationId: string | null
  applicationStatus: string | null
  engagementId: string | null
  workerId: string | null
  residentId: string | null
  hireRequestId: string | null
  hireRequestStatus: string | null
  hireRequestOfferedSalary: number | null
  hireRequestSpecialty: string | null
}) {
  const router   = useRouter()
  const supabase = createClient()
  const { T }    = useLanguage()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const [messages,      setMessages]      = useState<Message[]>(initialMessages)
  const [text,          setText]          = useState('')
  const [sending,       setSending]       = useState(false)
  const [appStatus,     setAppStatus]     = useState(initialAppStatus)
  const [hireStatus,    setHireStatus]    = useState(initialHireStatus)
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | 'accept_hire' | 'decline_hire' | null>(null)
  const [actionError,   setActionError]   = useState<string | null>(null)

  // Refresh nav badge when chat opens
  useEffect(() => { router.refresh() }, [])

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
        if (newMsg.sender_id !== currentUserId) {
          // Mark as read immediately and refresh badge
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id)
            .then(() => router.refresh())
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
    router.refresh()
  }

  // ── Resident accepts a job applicant ──
  async function handleAccept() {
    if (!applicationId || !workerId) return
    setActionLoading('accept')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setActionLoading(null); return }

    await supabase.from('job_applications')
      .update({ status: 'accepted', resolved_at: new Date().toISOString() })
      .eq('id', applicationId)

    const { data: app } = await supabase
      .from('job_applications').select('job_posting_id').eq('id', applicationId).single()
    const { data: job } = app?.job_posting_id
      ? await supabase.from('job_postings').select('offered_salary, specialty, id').eq('id', app.job_posting_id).single()
      : { data: null }

    await supabase.from('engagements').insert({
      employer_id: user.id,
      worker_id: workerId,
      job_application_id: applicationId,
      monthly_salary: job?.offered_salary ?? 0,
      service_type: job?.specialty ?? null,
      status: 'active',
    })

    if (job?.id) {
      await supabase.from('job_postings').update({ status: 'filled' }).eq('id', job.id)
    }

    setAppStatus('accepted')
    setActionLoading(null)
    router.refresh()
  }

  // ── Resident declines a job applicant ──
  async function handleDecline() {
    if (!applicationId) return
    setActionLoading('decline')
    await supabase.from('job_applications')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', applicationId)
    setAppStatus('rejected')
    setActionLoading(null)
    router.refresh()
  }

  // ── Worker accepts a hire request ──
  async function handleAcceptHire() {
    if (!hireRequestId || !workerId || !residentId) return
    setActionLoading('accept_hire')
    setActionError(null)

    const { error: hrErr } = await supabase.from('hire_requests')
      .update({ status: 'accepted', resolved_at: new Date().toISOString() })
      .eq('id', hireRequestId)
    if (hrErr) { setActionError('Could not update hire request. Try again.'); setActionLoading(null); return }

    const { error: engErr } = await supabase.from('engagements').insert({
      employer_id:     residentId,
      worker_id:       workerId,
      hire_request_id: hireRequestId,
      monthly_salary:  hireRequestOfferedSalary ?? 0,
      service_type:    hireRequestSpecialty ?? null,
      status:          'active',
    })
    if (engErr) {
      // Roll back hire_request status so worker can try again
      await supabase.from('hire_requests').update({ status: 'pending', resolved_at: null }).eq('id', hireRequestId)
      setActionError('Could not create engagement. It may already exist for this role.')
      setActionLoading(null)
      return
    }

    // Close any matching open job posting from this resident for this specialty
    if (hireRequestSpecialty) {
      const { data: matchingJobs } = await supabase
        .from('job_postings')
        .select('id')
        .eq('employer_id', residentId)
        .eq('specialty', hireRequestSpecialty)
        .eq('status', 'open')
      if (matchingJobs?.length) {
        await supabase.from('job_postings')
          .update({ status: 'filled' })
          .in('id', matchingJobs.map(j => j.id))
      }
    }

    setHireStatus('accepted')
    setActionLoading(null)
    router.refresh()
    router.push('/')
  }

  // ── Worker declines a hire request ──
  async function handleDeclineHire() {
    if (!hireRequestId) return
    setActionLoading('decline_hire')
    await supabase.from('hire_requests')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', hireRequestId)
    setHireStatus('declined')
    setActionLoading(null)
    router.refresh()
  }

  const initials = otherName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

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

  const grouped: { date: string; msgs: Message[] }[] = []
  messages.forEach(m => {
    const dateLabel = formatDate(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === dateLabel) last.msgs.push(m)
    else grouped.push({ date: dateLabel, msgs: [m] })
  })

  // Resident: show accept/decline for pending applicants
  const showAcceptDecline = isResident && applicationId && appStatus === 'pending'
  // Resident: show "invitation sent" status for pending hire requests they sent
  const showInviteSent    = isResident && hireRequestId && hireStatus === 'pending'
  // Worker: show accept/decline for pending hire requests
  const showHireActions   = !isResident && hireRequestId && hireStatus === 'pending'

  return (
    <div className="flex flex-col h-screen pb-20 bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 pt-12 pb-3 flex items-center gap-3 shadow-sm shrink-0">
        <button
          onClick={() => { router.back(); router.refresh() }}
          className="h-9 w-9 flex items-center justify-center text-slate-500 active:opacity-60 shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="h-10 w-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-[15px] leading-tight">{otherName}</p>
          <p className="text-[11px] text-slate-400 capitalize">{otherRole}</p>
        </div>
        {/* Status badges */}
        {appStatus === 'accepted' && (
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full shrink-0">
            {T.chat.hired}
          </span>
        )}
        {hireStatus === 'accepted' && (
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full shrink-0">
            {T.chat.hired}
          </span>
        )}
        {hireStatus === 'declined' && (
          <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full shrink-0">
            Declined
          </span>
        )}
      </header>

      {/* Resident action bar — accept/decline applicant */}
      {showAcceptDecline && (
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex gap-2 shrink-0">
          <button
            onClick={handleDecline}
            disabled={!!actionLoading}
            className="flex-1 h-10 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40"
          >
            {actionLoading === 'decline'
              ? <Loader2 size={14} className="animate-spin" />
              : <><XCircle size={14} /> {T.chat.declineHire}</>}
          </button>
          <button
            onClick={handleAccept}
            disabled={!!actionLoading}
            className="flex-1 h-10 rounded-2xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-40"
          >
            {actionLoading === 'accept'
              ? <Loader2 size={14} className="animate-spin" />
              : <><CheckCircle2 size={14} /> {T.chat.acceptApplicant}</>}
          </button>
        </div>
      )}

      {/* Resident: invitation sent banner */}
      {showInviteSent && (
        <div className="bg-violet-50 border-b border-violet-100 px-4 py-3 shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">Invitation Sent</span>
          <p className="text-xs text-violet-700">
            Waiting for {otherName} to accept
            {hireRequestOfferedSalary ? ` · ₹${hireRequestOfferedSalary.toLocaleString('en-IN')}/mo` : ''}
          </p>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 shrink-0">
          <p className="text-xs font-bold text-red-600">{actionError}</p>
        </div>
      )}

      {/* Worker action bar — accept/decline hire request */}
      {showHireActions && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 shrink-0">
          <p className="text-xs font-bold text-amber-700 mb-2">
            This resident wants to hire you
            {hireRequestOfferedSalary ? ` · ₹${hireRequestOfferedSalary.toLocaleString('en-IN')}/mo offered` : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeclineHire}
              disabled={!!actionLoading}
              className="flex-1 h-10 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40 bg-white"
            >
              {actionLoading === 'decline_hire'
                ? <Loader2 size={14} className="animate-spin" />
                : <><XCircle size={14} /> {T.chat.declineHire}</>}
            </button>
            <button
              onClick={handleAcceptHire}
              disabled={!!actionLoading}
              className="flex-1 h-10 rounded-2xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-40"
            >
              {actionLoading === 'accept_hire'
                ? <Loader2 size={14} className="animate-spin" />
                : <><CheckCircle2 size={14} /> {T.chat.acceptHire}</>}
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {grouped.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400 text-center">
              {T.chat.startConversation(otherName)}
            </p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center justify-center mb-3">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>

            <div className="space-y-1.5">
              {group.msgs.map((m, i) => {
                const isMine = m.sender_id === currentUserId

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
          placeholder={T.chat.typePlaceholder}
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