'use client'
/**
 * OnboardingForm — Modern UI. Collects role/name/phone/etc,
 * writes profiles + (for workers) a workers row, then sets password.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home as HomeIcon, HardHat, Loader2, CheckCircle2 } from 'lucide-react'

type Role = 'resident' | 'worker'
type Specialty = 'cook' | 'cleaner' | 'car_washer' | 'caretaker' | 'gardener' | 'maid' | 'other'

const SPECIALTIES: { key: Specialty; label: string }[] = [
  { key: 'maid',       label: 'Maid' },
  { key: 'cook',       label: 'Cook' },
  { key: 'cleaner',    label: 'Cleaner' },
  { key: 'car_washer', label: 'Car Washer' },
  { key: 'caretaker',  label: 'Caretaker' },
  { key: 'gardener',   label: 'Gardener' },
  { key: 'other',      label: 'Other' },
]

export default function OnboardingForm({
  userEmail,
  societies,
  defaultSocietyId,
}: {
  userEmail: string
  societies: { id: string; name: string }[]
  defaultSocietyId: string | null
}) {
  const router  = useRouter()
  const supabase = createClient()

  const [role, setRole]           = useState<Role | null>(null)
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [flat, setFlat]           = useState('')
  const [specialty, setSpecialty] = useState<Specialty>('maid')
  const [dailyRate, setDailyRate] = useState('')
  const [societyId, setSocietyId] = useState<string | null>(defaultSocietyId)
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError('Please choose Resident or Helper.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(null); setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); router.replace('/login'); return }

    // 1. Update profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
        flat_number: role === 'resident' ? flat || null : null,
        society_id: societyId,
        role,
      })
      .eq('id', user.id)
    if (profileErr) { setError(profileErr.message); setLoading(false); return }

    // 2. If worker, upsert workers row
    if (role === 'worker') {
      const rate = parseFloat(dailyRate || '0') || null
      const { error: wErr } = await supabase.from('workers').upsert(
        {
          auth_id: user.id,
          phone: phone || user.email || user.id,
          full_name: fullName,
          specialty,
          daily_rate: rate,
          society_id: societyId,
          is_active: true,
        },
        { onConflict: 'auth_id' },
      )
      if (wErr) { setError(wErr.message); setLoading(false); return }
    }

    // 3. Set password
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) { setError(pwErr.message); setLoading(false); return }

    setLoading(false)
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-700 to-violet-500 px-5 pt-14 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SH</span>
          </div>
          <span className="text-white/80 text-sm font-medium">Society Helper</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Almost there!</h1>
        <p className="text-violet-200 text-sm mt-1">
          Signed in as <span className="text-white font-medium">{userEmail}</span>
        </p>
      </div>

      <div className="px-5 pt-6 pb-12 space-y-4">

        {/* Role selector */}
        <Section title="I am a…">
          <div className="grid grid-cols-2 gap-3">
            <RoleTile
              active={role === 'resident'}
              onClick={() => setRole('resident')}
              icon={HomeIcon}
              label="Resident"
              hint="I hire helpers"
            />
            <RoleTile
              active={role === 'worker'}
              onClick={() => setRole('worker')}
              icon={HardHat}
              label="Helper"
              hint="I look for work"
            />
          </div>
        </Section>

        {/* Identity */}
        <Section title="About you">
          <Field label="Full name">
            <input className={inputCls} required
              value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} inputMode="tel"
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          {societies.length > 0 && (
            <Field label="Society">
              <select className={inputCls}
                value={societyId ?? ''} onChange={e => setSocietyId(e.target.value || null)}>
                {societies.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          )}
        </Section>

        {/* Resident: flat number */}
        {role === 'resident' && (
          <Section title="Your flat">
            <Field label="Flat number">
              <input className={inputCls}
                value={flat} onChange={e => setFlat(e.target.value)} placeholder="A-204" />
            </Field>
          </Section>
        )}

        {/* Worker: specialty + rate */}
        {role === 'worker' && (
          <Section title="Your work">
            <Field label="Specialty">
              <select className={inputCls}
                value={specialty} onChange={e => setSpecialty(e.target.value as Specialty)}>
                {SPECIALTIES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Daily rate (₹)">
              <input className={inputCls} inputMode="numeric"
                value={dailyRate}
                onChange={e => setDailyRate(e.target.value.replace(/\D/g, ''))}
                placeholder="500" />
            </Field>
          </Section>
        )}

        {/* Password */}
        <Section title="Set a password">
          <Field label="Password">
            <input className={inputCls} type="password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters" />
          </Field>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            You'll use this to sign in next time instead of OTP.
          </p>
        </Section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={loading || !role || !fullName || password.length < 6}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Setting up…' : 'Finish setup'}
        </button>
      </div>
    </main>
  )
}

/* ── Shared styles ── */
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function RoleTile({
  active, onClick, icon: Icon, label, hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 text-left transition ${
        active
          ? 'border-violet-500 bg-violet-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2.5 ${
        active ? 'bg-violet-600' : 'bg-slate-100'
      }`}>
        <Icon size={18} className={active ? 'text-white' : 'text-slate-500'} />
      </div>
      <p className={`text-sm font-bold ${active ? 'text-violet-700' : 'text-slate-900'}`}>
        {label}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
    </button>
  )
}
