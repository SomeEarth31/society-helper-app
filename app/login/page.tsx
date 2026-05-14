/**
 * Login page — smart email routing + Uber/UC-grade UI.
 *
 * Flow:
 *   email step → email_exists RPC (no side-effects):
 *     found    → password step
 *     not found→ signup step + "no account found" banner
 *   signup step → checks first:
 *     already exists → email step + "email matches, sign in" banner
 *     new            → OTP send → signup-otp step
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

type Step = 'email' | 'password' | 'otp' | 'signup' | 'signup-otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<Step>('email')
  const [email, setEmail]             = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [password, setPwd]            = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [otp, setOtp]                 = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [info, setInfo]               = useState<string | null>(null)

  function clear() { setError(null); setInfo(null) }

  /* ── Email step: smart routing ── */
  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    clear(); setLoading(true)

    const { data: exists, error: rpcErr } = await supabase.rpc('email_exists', {
      check_email: email,
    })
    setLoading(false)

    if (rpcErr) { setStep('password'); return } // graceful fallback

    if (exists) {
      setStep('password')
    } else {
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

  /* ── OTP send (existing user fallback) ── */
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

  /* ── OTP verify (login) ── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email, token: otp, type: 'email',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ── Signup: check then send OTP ── */
  async function handleSignupSendOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)

    const { data: exists } = await supabase.rpc('email_exists', {
      check_email: signupEmail,
    })

    if (exists) {
      setEmail(signupEmail)
      setInfo('Email matches — sign in below.')
      setStep('email')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: signupEmail,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo(`Verification code sent to ${signupEmail}.`)
    setStep('signup-otp')
  }

  /* ── Signup: verify OTP ── */
  async function handleSignupVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: signupEmail, token: otp, type: 'email',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  /* ── BACK handler per step ── */
  function handleBack() {
    clear()
    if (step === 'password') { setStep('email'); setPwd(''); setShowPwd(false) }
    else if (step === 'otp') { setStep('email'); setOtp('') }
    else if (step === 'signup') { setStep('email') }
    else if (step === 'signup-otp') { setStep('signup'); setOtp('') }
  }

  const activeEmail = step === 'signup' || step === 'signup-otp' ? signupEmail : email

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">

      {/* ── Dark hero ── */}
      <div className="relative flex-none px-6 pt-16 pb-20">
        {/* Back button */}
        {step !== 'email' && (
          <button
            onClick={handleBack}
            className="mb-8 flex items-center gap-2 text-slate-400 text-sm active:opacity-60"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}

        {/* Brand */}
        {step === 'email' && (
          <div className="mb-8">
            <div className="h-14 w-14 rounded-3xl bg-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-900/50">
              <span className="text-white font-black text-xl tracking-tight">SH</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">
              Society Helper
            </p>
          </div>
        )}

        {/* Heading */}
        <h1 className="text-4xl font-black text-white leading-none tracking-tight">
          {step === 'email'       && <>Welcome<br />back.</>}
          {step === 'password'    && <>Enter<br />password.</>}
          {step === 'otp'         && <>Check your<br />email.</>}
          {step === 'signup'      && <>Create<br />account.</>}
          {step === 'signup-otp'  && <>Verify<br />your email.</>}
        </h1>

        {/* Sub-heading */}
        <p className="mt-3 text-slate-400 text-sm leading-relaxed">
          {step === 'email'      && 'Enter your email to get started.'}
          {step === 'password'   && `Signing in as ${email}`}
          {step === 'otp'        && `We sent a code to ${email}`}
          {step === 'signup'     && 'Join your society in seconds.'}
          {step === 'signup-otp' && `Check ${signupEmail} for a 6–8 digit code.`}
        </p>
      </div>

      {/* ── White form sheet ── */}
      <div className="flex-1 bg-white rounded-t-[2rem] px-6 pt-8 pb-12 min-h-[60vh]">

        {/* Info banner */}
        {info && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3.5">
            <CheckCircle2 size={16} className="text-violet-600 mt-0.5 shrink-0" />
            <p className="text-sm text-violet-800 leading-snug">{info}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 leading-snug">{error}</p>
          </div>
        )}

        {/* ── Email step ── */}
        {step === 'email' && (
          <form onSubmit={handleEmailContinue} className="space-y-5">
            <InputField
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <PrimaryBtn loading={loading} disabled={!email} label="Continue" />

            <div className="pt-6 text-center border-t border-slate-100">
              <p className="text-sm text-slate-400 mb-2">New to Society Helper?</p>
              <button
                type="button"
                onClick={() => { clear(); setStep('signup') }}
                className="text-sm font-bold text-violet-600 active:opacity-60"
              >
                Create an account →
              </button>
            </div>
          </form>
        )}

        {/* ── Password step ── */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSignIn} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <PrimaryBtn loading={loading} disabled={!password} label="Sign in" />
            <SecondaryBtn
              loading={loading}
              onClick={handleSendOtp}
              label="Send a one-time code instead"
            />
          </form>
        )}

        {/* ── OTP verify (login) ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <OtpInput value={otp} onChange={setOtp} />
            <PrimaryBtn loading={loading} disabled={otp.length < 6} label="Sign in" />
          </form>
        )}

        {/* ── Signup: enter email ── */}
        {step === 'signup' && (
          <form onSubmit={handleSignupSendOtp} className="space-y-5">
            <InputField
              label="Your email address"
              type="email"
              value={signupEmail}
              onChange={setSignupEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <PrimaryBtn
              loading={loading}
              disabled={!signupEmail}
              label="Send verification code"
            />
          </form>
        )}

        {/* ── Signup: verify OTP ── */}
        {step === 'signup-otp' && (
          <form onSubmit={handleSignupVerifyOtp} className="space-y-5">
            <OtpInput value={otp} onChange={setOtp} />
            <PrimaryBtn
              loading={loading}
              disabled={otp.length < 6}
              label="Verify & continue"
            />
          </form>
        )}

      </div>

      <p className="bg-white py-3 text-center text-[11px] text-slate-300">
        By continuing you agree to our terms of service.
      </p>
    </div>
  )
}

/* ── Shared style tokens ── */
const inputCls =
  'w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-4 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-violet-500 focus:bg-white'

function InputField({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string; autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </span>
      <input
        type={type} required autoComplete={autoComplete}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  )
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
        Verification code
      </span>
      <input
        type="text" inputMode="numeric" required maxLength={8}
        value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="· · · · · · · ·"
        className={`${inputCls} text-center text-2xl font-black tracking-[0.5em]`}
      />
    </label>
  )
}

function PrimaryBtn({
  loading, disabled, label,
}: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white text-[15px] font-bold shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : label}
    </button>
  )
}

function SecondaryBtn({
  loading, onClick, label,
}: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 text-[15px] font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : label}
    </button>
  )
}
