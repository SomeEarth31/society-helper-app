/**
 * Login page — Supabase magic-link (OTP) auth.
 * Route: /login
 *
 * Flow:
 *   1. User enters phone or email → we call signInWithOtp
 *   2. User enters the 6-digit code → we call verifyOtp
 *   3. On success → redirect to /
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IndianRupee } from 'lucide-react'

type Step = 'identifier' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]         = useState<Step>('identifier')
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  /* ── Step 1: send magic link / OTP ── */
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  /* ── Step 2: verify OTP ── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-5">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <IndianRupee size={20} className="text-white" />
        </div>
        <span className="text-xl font-semibold text-neutral-900">Society Helper</span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
        {step === 'identifier' ? (
          <>
            <h1 className="text-lg font-semibold text-neutral-900 mb-1">Sign in</h1>
            <p className="text-sm text-neutral-500 mb-5">
              We'll send a one-time code to your email.
            </p>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-neutral-900 mb-1">Enter your code</h1>
            <p className="text-sm text-neutral-500 mb-5">
              Check <span className="font-medium text-neutral-700">{email}</span> for an 8-digit code.
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1" htmlFor="otp">
                  One-time code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={8}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm tracking-widest outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length < 8}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('identifier'); setOtp(''); setError(null) }}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700 transition"
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
