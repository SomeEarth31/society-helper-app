'use client'
/**
 * LogoutButton — clears the Supabase session in the browser
 * and bounces the user to /login.
 *
 * We use the browser client (not a server action) so the
 * auth cookie is cleared in this tab's storage immediately,
 * and useRouter().push() does a soft client-side nav.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const handleLogout = () => {
    setErr(null)
    start(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        setErr(error.message)
        return
      }
      // Refresh so the (app) layout re-evaluates auth and bounces to /login.
      router.push('/login')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        onClick={handleLogout}
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-white border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm transition active:scale-[0.98] hover:bg-rose-50 disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
        {pending ? 'Signing out…' : 'Log out'}
      </button>
      {err && <span className="text-xs text-red-600 text-center">{err}</span>}
    </div>
  )
}
