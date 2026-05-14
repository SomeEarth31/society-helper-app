/**
 * Login page — supports password sign-in, OTP login, and new sign-up via OTP.
 * Route: /login
 *
 * Flow:
 *   • Email step → user enters email.
 *       - "Continue" tries password sign-in (if account has one).
 *       - "Login with OTP instead" sends a one-time code.
 *   • Password step → enter password → signInWithPassword.
 *   • OTP step → enter 6/8-digit code → verifyOtp.
 *   • Signup step → user enters email → OTP sent → verifyOtp → onboarding.
 *
 * After successful sign-in we route to / — the (app) layout will
 * bounce first-time users to /onboarding if their profile is incomplete.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IndianRupee, Loader2 } from 'lucide-react'

type Step = 'email' | 'password' | 'otp' | 'signup' | 'signup-otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]       = useState<Step>('email')
  const [email, setEmail]     = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [password, setPwd]    = useState('')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [info, setInfo]       = useState<string | null>(null)

  /* ── Email step → reveal password input ── */
  function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null)
    if (!email) return
    setStep('password')
  }

  /* ── Password sign-in ── */
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ── OTP fallback: send code (for existing users logging in) ── */
  async function handleSendOtp() {
    setError(null); setInfo(null); setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo(`We sent a code to ${email}.`)
    setStep('otp')
  }

  /* ── OTP verify (login) ── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ── Signup: send OTP to new email ── */
  async function handleSignupSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: signupEmail,
        options: { shouldCreateUser: true },
      })
      if (error) { setError(error.message); return }
      setInfo(`We sent a code to ${signupEmail}.`)
      setStep('signup-otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Signup: verify OTP → onboarding ── */
  async function handleSignupVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: signupEmail,
        token: otp,
        type: 'email',
      })
      if (error) { setError(error.message); return }
      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-5">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <IndianRupee size={20} className="text-white" />
        </div>
        <span className="text-xl font-semibold text-neutral-900 tracking-tight">Society Helper</span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">

        {/* ── Sign in: email ── */}
        {step === 'email' && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Sign in</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Use your email and password, or get a one-time code.
            </p>
            <form onSubmit={handleEmailContinue} className="mt-5 space-y-4">
              <Field label="Email address">
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </Field>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" className={primaryBtn}>Continue</button>
              <button
                type="button" onClick={handleSendOtp} disabled={!email || loading}
                className={secondaryBtn}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Login with OTP instead
              </button>
            </form>

            <div className="mt-6 border-t border-neutral-100 pt-5">
              <p className="text-center text-xs text-neutral-500 mb-3">Don&apos;t have an account?</p>
              <button
                type="button"
                onClick={() => { setError(null); setStep('signup') }}
                className={secondaryBtn}
              >
                Create an account
              </button>
            </div>
          </>
        )}

        {/* ── Sign in: password ── */}
        {step === 'password' && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Enter password</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Signing in as <span className="font-medium text-neutral-700">{email}</span>
            </p>
            <form onSubmit={handlePasswordSignIn} className="mt-5 space-y-4">
              <Field label="Password">
                <input
                  type="password" required autoComplete="current-password"
                  value={password} onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </Field>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" disabled={loading} className={primaryBtn}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button type="button" onClick={handleSendOtp} disabled={loading} className={secondaryBtn}>
                Login with OTP instead
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setPwd(''); setError(null) }}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}

        {/* ── Sign in: OTP verify ── */}
        {step === 'otp' && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Enter your code</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {info ?? `Check ${email} for the code.`}
            </p>
            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
              <Field label="One-time code">
                <input
                  type="text" inputMode="numeric" required maxLength={8}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678"
                  className={`${inputCls} tracking-widest text-center`}
                />
              </Field>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button
                type="submit" disabled={loading || otp.length < 8}
                className={primaryBtn}
              >
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(null); setInfo(null) }}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}

        {/* ── Sign up: enter email ── */}
        {step === 'signup' && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Create account</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Enter your email and we&apos;ll send you a one-time code to get started.
            </p>
            <form onSubmit={handleSignupSendOtp} className="mt-5 space-y-4">
              <Field label="Email address">
                <input
                  type="email" required autoComplete="email"
                  value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </Field>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" disabled={loading || !signupEmail} className={primaryBtn}>
                {loading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                {loading ? 'Sending…' : 'Send code'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(null) }}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Back to sign in
              </button>
            </form>
          </>
        )}

        {/* ── Sign up: verify OTP ── */}
        {step === 'signup-otp' && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Verify your email</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {info ?? `Enter the code we sent to ${signupEmail}.`}
            </p>
            <form onSubmit={handleSignupVerifyOtp} className="mt-5 space-y-4">
              <Field label="One-time code">
                <input
                  type="text" inputMode="numeric" required maxLength={8}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678"
                  className={`${inputCls} tracking-widest text-center`}
                />
              </Field>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button
                type="submit" disabled={loading || otp.length < 8}
                className={primaryBtn}
              >
                {loading ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('signup'); setOtp(''); setError(null); setInfo(null) }}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-[11px] text-neutral-400">By signing in you agree to our terms.</p>
    </main>
  )
}

/* ── tiny presentational helpers ── */
const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
const primaryBtn =
  'w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700 disabled:opacity-50'
const secondaryBtn =
  'w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  )
}
