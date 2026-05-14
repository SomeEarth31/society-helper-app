'use client'
/**
 * OnboardingForm — collects role/name/phone/etc and writes profiles +
 * (for workers) a workers row, then sets the user's password.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IndianRupee, Home as HomeIcon, HardHat, Loader2 } from 'lucide-react'

type Role = 'resident' | 'worker'
type Specialty = 'cook' | 'cleaner' | 'car_washer' | 'caretaker' | 'gardener' | 'maid' | 'other'

const SPECIALTIES: { key: Specialty; label: string }[] = [
  { key: 'maid',       label: 'Maid' },
  { key: 'cook',       label: 'Cook' },
  { key: 'cleaner',    label: 'Cleaner' },
  { key: 'car_washer', label: 'Car washer' },
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
  const router = useRouter()
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

    // 1. Update profile.
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

    // 2. If worker, upsert a workers row linked to this auth user.
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

    // 3. Set password so they don't need OTP next time.
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) { setError(pwErr.message); setLoading(false); return }

    setLoading(false)
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <IndianRupee size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-neutral-900 tracking-tight">
            Welcome to Society Helper
          </span>
        </div>

        <p className="mb-5 text-sm text-neutral-500">
          Signed in as <span className="font-medium text-neutral-700">{userEmail}</span>.
          Tell us a little about you to finish setting up.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role */}
          <Card>
            <Label>I am a…</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <RoleTile
                active={role === 'resident'}
                onClick={() => setRole('resident')}
                icon={HomeIcon} label="Resident"
                hint="I hire helpers"
              />
              <RoleTile
                active={role === 'worker'}
                onClick={() => setRole('worker')}
                icon={HardHat} label="Helper"
                hint="I look for work"
              />
            </div>
          </Card>

          {/* Identity */}
          <Card>
            <Field label="Full name">
              <input className={inputCls} required
                value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Phone">
              <input className={inputCls} inputMode="tel"
                value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91…" />
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
          </Card>

          {/* Role-specific */}
          {role === 'resident' && (
            <Card>
              <Field label="Flat number">
                <input className={inputCls}
                  value={flat} onChange={e => setFlat(e.target.value)} placeholder="A-204" />
              </Field>
            </Card>
          )}

          {role === 'worker' && (
            <Card>
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
                  value={dailyRate} onChange={e => setDailyRate(e.target.value.replace(/\D/g, ''))}
                  placeholder="500" />
              </Field>
            </Card>
          )}

          {/* Password */}
          <Card>
            <Field label="Set a password">
              <input className={inputCls} type="password" required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </Field>
            <p className="text-[11px] text-neutral-400">You'll use this next time instead of an OTP.</p>
          </Card>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !role}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Finishing up…' : 'Finish setup'}
          </button>
        </form>
      </div>
    </main>
  )
}

/* ── presentational helpers ── */
const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
      {children}
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{children}</p>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
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
    <button type="button" onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      }`}>
      <Icon size={20} className={active ? 'text-indigo-600' : 'text-neutral-500'} />
      <p className={`mt-2 text-sm font-semibold ${active ? 'text-indigo-700' : 'text-neutral-900'}`}>
        {label}
      </p>
      <p className="text-[11px] text-neutral-500">{hint}</p>
    </button>
  )
}
