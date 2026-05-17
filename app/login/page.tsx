'use client'
/**
 * Login — smart email routing + Uber/UC-grade mobile UI.
 * After OTP login for existing user → redirect to /change-password
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import LangToggle from '@/components/LangToggle'
import { useLanguage } from '@/contexts/LanguageContext'

type Step = 'email' | 'password' | 'otp' | 'signup' | 'signup-otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { T } = useLanguage()
  const L = T.login

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

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    clear(); setLoading(true)
    const { data: exists, error: rpcErr } = await supabase.rpc('email_exists', { check_email: email })
    setLoading(false)
    if (rpcErr) { setStep('password'); return }
    if (exists) { setStep('password') }
    else { setSignupEmail(email); setInfo(L.noAccount); setStep('signup') }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/'); router.refresh()
  }

  async function handleSendOtp() {
    clear(); setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo(L.codeSent(email)); setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) { setError(error.message); return }
    // OTP login for existing user → prompt password set
    router.replace('/change-password?from=otp')
  }

  async function handleSignupSendOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { data: exists } = await supabase.rpc('email_exists', { check_email: signupEmail })
    if (exists) {
      setEmail(signupEmail); setInfo(L.emailMatches); setStep('email'); setLoading(false); return
    }
    const { error } = await supabase.auth.signInWithOtp({ email: signupEmail, options: { shouldCreateUser: true } })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo(L.codeSent(signupEmail)); setStep('signup-otp')
  }

  async function handleSignupVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    clear(); setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email: signupEmail, token: otp, type: 'email' })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
  }

  function handleBack() {
    clear()
    if (step === 'password') { setStep('email'); setPwd(''); setShowPwd(false) }
    else if (step === 'otp') { setStep('email'); setOtp('') }
    else if (step === 'signup') setStep('email')
    else if (step === 'signup-otp') { setStep('signup'); setOtp('') }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">

      {/* ── Dark hero ── */}
      <div className="flex-none px-6 pt-14 pb-20 relative">
        {/* Language toggle */}
        <div className="absolute top-5 right-5">
          <LangToggle />
        </div>

        {step !== 'email' && (
          <button onClick={handleBack}
            className="mb-8 flex items-center gap-2 text-slate-400 text-sm min-h-[44px]">
            <ArrowLeft size={18} /> Back
          </button>
        )}

        {step === 'email' && (
          <div className="mb-6">
            <div className="h-14 w-14 rounded-3xl bg-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-900/40">
              <span className="text-white font-black text-xl tracking-tight">SH</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Society Helper</p>
          </div>
        )}

        <h1 className="text-4xl font-black text-white leading-none tracking-tight" style={{ whiteSpace: 'pre-line' }}>
          {step === 'email'      && L.welcome}
          {step === 'password'   && L.enterPassword}
          {step === 'otp'        && L.checkEmail}
          {step === 'signup'     && L.createAccount}
          {step === 'signup-otp' && L.verifyEmail}
        </h1>
        <p className="mt-3 text-slate-400 text-sm leading-relaxed">
          {step === 'email'      && L.subtitleEmail}
          {step === 'password'   && L.subtitlePassword(email)}
          {step === 'otp'        && L.subtitleOtp(email)}
          {step === 'signup'     && L.subtitleSignup}
          {step === 'signup-otp' && L.subtitleSignupOtp(signupEmail)}
        </p>
      </div>

      {/* ── White form sheet ── */}
      <div className="flex-1 bg-white rounded-t-[2rem] px-5 pt-7 pb-12 min-h-[58vh]">

        {info && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-violet-50 border border-violet-200 px-4 py-3.5">
            <CheckCircle2 size={16} className="text-violet-600 mt-0.5 shrink-0" />
            <p className="text-sm text-violet-800 leading-snug">{info}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 leading-snug">{error}</p>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleEmailContinue} className="space-y-4">
            <InputField label={L.emailLabel} type="email" value={email}
              onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
            <PrimaryBtn loading={loading} disabled={!email} label={L.continue} />
            <div className="pt-5 text-center border-t border-slate-100">
              <p className="text-sm text-slate-400 mb-3">{L.newUser}</p>
              <button type="button" onClick={() => { clear(); setStep('signup') }}
                className="text-[15px] font-bold text-violet-600 min-h-[44px]">
                {L.createAccountLink}
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{L.passwordLabel}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••" className={inputCls}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <PrimaryBtn loading={loading} disabled={!password} label={L.signIn} />
            <SecondaryBtn loading={loading} onClick={handleSendOtp} label={L.sendOtp} />
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <OtpInput label={L.verificationCode} value={otp} onChange={setOtp} />
            <PrimaryBtn loading={loading} disabled={otp.length < 6} label={L.verifySignIn} />
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignupSendOtp} className="space-y-4">
            <InputField label={L.yourEmailLabel} type="email" value={signupEmail}
              onChange={setSignupEmail} placeholder="you@example.com" autoComplete="email" />
            <PrimaryBtn loading={loading} disabled={!signupEmail} label={L.sendVerificationCode} />
          </form>
        )}

        {step === 'signup-otp' && (
          <form onSubmit={handleSignupVerifyOtp} className="space-y-4">
            <OtpInput label={L.verificationCode} value={otp} onChange={setOtp} />
            <PrimaryBtn loading={loading} disabled={otp.length < 6} label={L.verifyContinue} />
          </form>
        )}
      </div>

      <p className="bg-white py-4 text-center text-[11px] text-slate-300">
        {L.terms}
      </p>
    </div>
  )
}

const inputCls = 'w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-violet-500 focus:bg-white shadow-sm'

function InputField({ label, type, value, onChange, placeholder, autoComplete }: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string; autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</span>
      <input type={type} required autoComplete={autoComplete} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  )
}

function OtpInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</span>
      <input type="text" inputMode="numeric" required maxLength={8}
        value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="· · · · · ·"
        className={`${inputCls} text-center text-2xl font-black tracking-[0.5em]`} />
    </label>
  )
}

function PrimaryBtn({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white text-[15px] font-bold shadow-lg shadow-violet-200 transition active:scale-[0.98] disabled:opacity-40">
      {loading ? <Loader2 size={18} className="animate-spin" /> : label}
    </button>
  )
}

function SecondaryBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-40">
      {loading ? <Loader2 size={16} className="animate-spin" /> : label}
    </button>
  )
}
