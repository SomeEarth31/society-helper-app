/**
 * Login page — smart email routing + modern UI.
 *
 * Flow:
 *   • email step → "Continue" calls email_exists RPC (no side-effects)
 *       - email found    → password step
 *       - email NOT found → signup step with "no account found" banner
 *   • password step → signInWithPassword  (OTP fallback available)
 *   • otp step      → verifyOtp (existing user)
 *   • signup step   → "Send code" first checks if email exists
 *       - already exists → back to email step with "email matches, sign in" banner
 *       - new email      → signInWithOtp (shouldCreateUser: true) → signup-otp
 *   • signup-otp step → verifyOtp → onboarding
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Step = 'email' | 'password' | 'otp' | 'signup' | 'signup-otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]             = useState<Step>('email')
  const [email, setEmail]           = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [password, setPwd]          = useState('')
  const [otp, setOtp]               = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [info, setInfo]             = useState<string | null>(null)

  function clear() { setError(null); setInfo(null) }

  /* ── Email step: smart routing via email_exists RPC ── */
  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    clear(); setLoading(true)

    const { data: exists, error: rpcErr } = await supabase.rpc('email_exists', {
      check_email: email,
    })
    setLoading(false)

    if (rpcErr) {
      // RPC unavailable (e.g. migration not yet run) — fall back gracefully
      setStep('password')
      return
    }

    if (exists) {
      setStep('password')
    } else {
      // No account → send user to signup
      setSignupEmail(email)
      setInfo("No account found for this email. Create one below.")
      setStep('signup')
    }
  }

  /* ── Password sign-in ── */
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ── OTP fallback for existing users ── */
  async function handleSendOtp() {
    clear(); setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo(`Code sent to ${email}.`)
    setStep('otp')
  }

  /* ── OTP verify (existing user login) ── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ── Signup: check first, then send OTP ── */
  async function handleSignupSendOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)

    // Check whether this email already has an account
    const { data: exists } = await supabase.rpc('email_exists', { check_email: signupEmail })

    if (exists) {
      // Already registered → redirect to sign-in with info banner
      setEmail(signupEmail)
      setInfo('Email matches — sign in below.')
      setStep('email')
      setLoading(false)
      return
    }

    // New user — send OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: signupEmail,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo(`Code sent to ${signupEmail}.`)
    setStep('signup-otp')
  }

  /* ── Signup: verify OTP → onboarding ── */
  async function handleSignupVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: signupEmail,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ─────────── RENDER ─────────── */
  const headings: Record<Step, string> = {
    email:       'Welcome back',
    password:    'Enter password',
    otp:         'Check your email',
    signup:      'Create account',
    'signup-otp':'Verify your email',
  }
  const subtitles: Record<Step, string> = {
    email:       'Enter your email to continue',
    password:    `Signing in as ${email}`,
    otp:         `We sent a code to ${email}`,
    signup:      'Join Society Helper in seconds',
    'signup-otp': `We sent a code to ${signupEmail}`,
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Brand header ── */}
      <div className="bg-violet-600 px-6 pt-16 pb-14">
        {/* Back button (visible on inner steps) */}
        {step !== 'email' && (
          <button
            onClick={() => {
              clear()
              if (step === 'password' || step === 'otp') { setStep('email'); setPwd(''); setOtp('') }
              else if (step === 'signup') setStep('email')
              else if (step === 'signup-otp') { setStep('signup'); setOtp('') }
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-violet-200 text-sm"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        )}

        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-tight">SH</span>
          </div>
          <span className="text-white/80 font-medium text-sm">Society Helper</span>
        </div>

        <h1 className="text-3xl font-bold text-white leading-snug">
          {headings[step]}
        </h1>
        <p className="mt-1.5 text-violet-200 text-sm">
          {subtitles[step]}
        </p>
      </div>

      {/* ── Form card ── */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-5 px-6 pt-8 pb-12 shadow-[0_-4px_24px_rgba(109,40,217,0.1)]">

        {/* Info banner */}
        {info && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3.5">
            <CheckCircle2 size={17} className="text-violet-600 mt-0.5 shrink-0" />
            <p className="text-sm text-violet-800 leading-snug">{info}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3.5">
            <AlertCircle size={17} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 leading-snug">{error}</p>
          </div>
        )}

        {/* ── Email step ── */}
        {step === 'email' && (
          <form onSubmit={handleEmailContinue} className="space-y-4">
            <Field label="Email address">
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>
            <button type="submit" disabled={!email || loading} className={primaryBtn}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Continue'}
            </button>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-1">
              <p className="text-sm text-slate-500">New to Society Helper?</p>
              <button
                type="button"
                onClick={() => { clear(); setStep('signup') }}
                className="text-sm font-semibold text-violet-600 active:opacity-70"
              >
                Create an account →
              </button>
            </div>
          </form>
        )}

        {/* ── Password step ── */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <Field label="Password">
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={e => setPwd(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
            </button>
            <button
              type="button" onClick={handleSendOtp} disabled={loading}
              className={secondaryBtn}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Get a one-time code instead
            </button>
          </form>
        )}

        {/* ── OTP verify (login) ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Field label="6–8 digit code">
              <input
                type="text" inputMode="numeric" required maxLength={8}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••••"
                className={`${inputCls} tracking-[0.4em] text-center text-xl font-semibold`}
              />
            </Field>
            <button
              type="submit" disabled={loading || otp.length < 6}
              className={primaryBtn}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
            </button>
          </form>
        )}

        {/* ── Signup: enter email ── */}
        {step === 'signup' && (
          <form onSubmit={handleSignupSendOtp} className="space-y-4">
            <Field label="Your email address">
              <input
                type="email" required autoComplete="email"
                value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>
            <button type="submit" disabled={loading || !signupEmail} className={primaryBtn}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send verification code'}
            </button>
          </form>
        )}

        {/* ── Signup: verify OTP ── */}
        {step === 'signup-otp' && (
          <form onSubmit={handleSignupVerifyOtp} className="space-y-4">
            <Field label="6–8 digit code">
              <input
                type="text" inputMode="numeric" required maxLength={8}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••••"
                className={`${inputCls} tracking-[0.4em] text-center text-xl font-semibold`}
              />
            </Field>
            <button
              type="submit" disabled={loading || otp.length < 6}
              className={primaryBtn}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify & continue'}
            </button>
          </form>
        )}

      </div>

      <p className="py-4 text-center text-[11px] text-slate-400 bg-white">
        By continuing you agree to our terms of service.
      </p>
    </main>
  )
}

/* ── Shared style tokens ── */
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100'

const primaryBtn =
  'w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-50'

const secondaryBtn =
  'w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}
