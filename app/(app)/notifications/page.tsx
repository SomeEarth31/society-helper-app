/**
 * /notifications — In-app notification feed
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Bell, Briefcase, CheckCircle2, XCircle, MessageCircle, UserPlus, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

const NOTIF_ICON: Record<string, React.ComponentType<any>> = {
  job_application:     UserPlus,
  application_accepted:CheckCircle2,
  application_rejected:XCircle,
  hire_request:        UserPlus,
  hire_accepted:       CheckCircle2,
  hire_declined:       XCircle,
  new_message:         MessageCircle,
  review_received:     Star,
}

const NOTIF_COLOR: Record<string, string> = {
  job_application:     'bg-violet-100 text-violet-600',
  application_accepted:'bg-emerald-100 text-emerald-600',
  application_rejected:'bg-red-100 text-red-500',
  hire_request:        'bg-violet-100 text-violet-600',
  hire_accepted:       'bg-emerald-100 text-emerald-600',
  hire_declined:       'bg-red-100 text-red-500',
  new_message:         'bg-blue-100 text-blue-600',
  review_received:     'bg-amber-100 text-amber-600',
}

function notifLink(notif: any): string {
  const p = notif.payload ?? {}
  if (p.conversation_id) return `/chat/${p.conversation_id}`
  if (p.job_posting_id && notif.type === 'job_application') return `/jobs/${p.job_posting_id}/applicants`
  if (p.hire_request_id) return `/hire-requests`
  return '/notifications'
}

export default async function NotificationsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, created_at, payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unreadCount = (notifications ?? []).filter(n => !n.is_read).length

  // Mark all as read
  if (unreadCount > 0) {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white px-5 pt-14 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-violet-600 font-bold mt-0.5">{unreadCount} new</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 mt-5">
        {(!notifications || notifications.length === 0) ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Bell size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-500">No notifications yet</p>
            <p className="text-xs text-slate-400 mt-1">Activity on your jobs and chats will appear here</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n: any) => {
              const Icon  = NOTIF_ICON[n.type] ?? Bell
              const color = NOTIF_COLOR[n.type] ?? 'bg-slate-100 text-slate-500'
              const href  = notifLink(n)
              return (
                <li key={n.id}>
                  <Link href={href}
                    className={`flex items-start gap-3.5 rounded-3xl px-4 py-3.5 border transition active:opacity-80 ${
                      !n.is_read
                        ? 'bg-violet-50 border-violet-100'
                        : 'bg-white border-slate-100 shadow-sm'
                    }`}>
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] leading-snug ${!n.is_read ? 'font-black text-slate-900' : 'font-semibold text-slate-800'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(n.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="h-2.5 w-2.5 rounded-full bg-violet-500 mt-1 shrink-0" />
                    )}
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
