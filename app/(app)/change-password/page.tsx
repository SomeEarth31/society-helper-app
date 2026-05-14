'use client'
/**
 * /change-password
 *
 * Two entry points:
 *   A) ?from=otp   → user just logged in via OTP, nudge them to set a password.
 *                    Shows "Send reset link" (calls resetPasswordForEmail).
 *   B) ?step=reset → user arrived back after clicking the reset link in email.
 *                    Session type is `recovery`. Show "enter new password" form.
 *
 * Also reachable from Profile → Change password (same as A).
 *
 * Flow:
 *   1. User enters email / we read it from session → resetPasswordForEmail()
 *   2. Supabase sends "Reset Password" email with {{ .ConfirmationURL }}
 *   3. User clicks link → /auth/callback?code=…&next=/change-password?step=reset
 *   4. Callback exchanges code → session with type=recovery
 *   5. User enters new password → updateUser({ password })
 */
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react'

type Step = 'request' | 'sent' | 'reset' | 'done'

export default function ChangePasswordPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fromOtp      = searchParams.get('from') === 'otp'
  const isReset      = searchParams.get('step') === 'reset'
  const supabase     = createClient()

  const [step, setStep]       = useState<Step>(isReset ? 'reset' : 'request')
  const [email, setEmail]     = useState('')
  const [newPwd, setNewPwd]   = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Pre-fill email from session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  // ── Step 1: send the reset email ──
  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(null); setLoading(true)

    const redirectTo =
      `${window.location.origin}/auth/callback?next=/change-password?step=reset`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('sent')
  }

  // ── Step 2: set the new password (after clicking email link) ──
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(null); setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('done')
  }

  // ── Done ──
  if (step === 'done') {
    return (
      <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/40">
          <ShieldCheck size={36} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Password updated!</h1>
        <p className="text-slate-400 text-sm mb-8">You're all set. Sign in with your new password next time.</p>
        <button onClick={() => router.replace('/')}
          className="w-full max-w-xs h-14 rounded-2xl bg-violet-600 text-white font-bold text-[15px] shadow-lg shadow-violet-900/40">
          Go home
        </button>
      </main>
    )
  }

  // ── Sent (waiting for user to click email link) ──
  if (step === 'sent') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <div className="flex-none px-6 pt-14 pb-20">
          <div className="h-14 w-14 rounded-3xl bg-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-900/40">
            <Mail size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white leading-none tracking-tight">Check your<br />email.</h1>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed">
            We sent a password reset link to <span className="text-white font-semibold">{email}</span>. Click the link to set your new password.
          </p>
        </div>
        <div className="flex-1 bg-white rounded-t-[2rem] px-5 pt-7 pb-12">
          <div className="flex items-start gap-3 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-4">
            <CheckCircle2 size={16} className="text-violet-600 mt-0.5 shrink-0" />
            <p className="text-sm text-violet-800 leading-relaxed">
              The link in your email will open the app and let you set a new password. It expires in 1 hour.
            </p>
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">
            Didn't get it?{' '}
            <button onClick={() => setStep('request')} className="font-bold text-violet-600 min-h-[36px]">
              Resend
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Reset form (step=reset, after clicking email link) ──
  if (step === 'reset') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <div className="flex-none px-6 pt-14 pb-20">
          <div className="h-14 w-14 rounded-3xl bg-amber-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-900/40">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white leading-none tracking-tight">New<br />password.</h1>
          <p className="mt-3 text-slate-400 text-sm">Choose a strong password for your account.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="flex-1 bg-white rounded-t-[2rem] px-5 pt-7 pb-12 space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required minLength={6}
                value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="At least 6 characters"
                className={inputCls}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-11 h-11 flex items-center justify-center">
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {newPwd.length >= 6 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 size={12} /> Looks good
              </p>
            )}
          </div>
          <button type="submit" disabled={loading || newPwd.length < 6}
            className="w-full h-14 rounded-2xl bg-violet-600 text-white font-bold text-[15px] shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-40">
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Set new password'}
          </button>
        </form>
      </div>
    )
  }

  // ── Request step (default) ──
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <div className="flex-none px-6 pt-14 pb-20">
        <button onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-slate-400 text-sm min-h-[44px]">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="h-14 w-14 rounded-3xl bg-amber-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-900/40">
          <ShieldCheck size={26} className="text-white" />
        </div>
        <h1 className="text-4xl font-black text-white leading-none tracking-tight">
          {fromOtp ? <>Set your<br />password.</> : <>Change<br />password.</>}
        </h1>
        <p className="mt-3 text-slate-400 text-sm leading-relaxed">
          {fromOtp
            ? "You logged in with a one-time code. Set a permanent password so signing in is faster next time."
            : "We'll email you a secure link to set a new password."}
        </p>
      </div>

      <form onSubmit={handleSendReset} className="flex-1 bg-white rounded-t-[2rem] px-5 pt-7 pb-12 space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Your email
          </label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
        <button type="submit" disabled={loading || !email}
          className="w-full h-14 rounded-2xl bg-violet-600 text-white font-bold text-[15px] shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-40">
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}

const inputCls = 'w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-violet-500 shadow-sm'
