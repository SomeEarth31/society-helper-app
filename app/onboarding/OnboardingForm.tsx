'use client'
/**
 * OnboardingForm — Uber/UC-grade UI.
 * Collects role/name/phone/etc → writes profile + workers row → sets password.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home as HomeIcon, HardHat, Loader2, CheckCircle2, ChevronRight } from 'lucide-react'

type Role = 'resident' | 'worker'
type Specialty = 'cook' | 'cleaner' | 'car_washer' | 'caretaker' | 'gardener' | 'maid' | 'other'

const SPECIALTIES: { key: Specialty; label: string; emoji: string }[] = [
  { key: 'maid',       label: 'Maid',       emoji: '🧹' },
  { key: 'cook',       label: 'Cook',       emoji: '👨‍🍳' },
  { key: 'cleaner',    label: 'Cleaner',    emoji: '🫧' },
  { key: 'car_washer', label: 'Car Washer', emoji: '🚗' },
  { key: 'caretaker',  label: 'Caretaker',  emoji: '🤲' },
  { key: 'gardener',   label: 'Gardener',   emoji: '🌿' },
  { key: 'other',      label: 'Other',      emoji: '⚙️' },
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
  const router   = useRouter()
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

  // async function handleSubmit(e: React.FormEvent) {
  //   e.preventDefault()
  //   if (!role)             { setError('Please choose Resident or Helper.'); return }
  //   if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
  //   setError(null); setLoading(true)

  //   const { data: { user } } = await supabase.auth.getUser()
  //   if (!user) { setLoading(false); router.replace('/login'); return }

  //   const { error: profileErr } = await supabase.from('profiles').update({
  //     full_name: fullName, phone: phone || null,
  //     flat_number: role === 'resident' ? flat || null : null,
  //     society_id: societyId, role,
  //   }).eq('id', user.id)
  //   if (profileErr) { setError(profileErr.message); setLoading(false); return }

  //   if (role === 'worker') {
  //     const rate = parseFloat(dailyRate || '0') || null
  //     const { error: wErr } = await supabase.from('workers').upsert(
  //       {
  //         auth_id: user.id, phone: phone || user.email || user.id,
  //         full_name: fullName, specialty, daily_rate: rate,
  //         society_id: societyId, is_active: true,
  //       },
  //       { onConflict: 'auth_id' },
  //     )
  //     if (wErr) { setError(wErr.message); setLoading(false); return }
  //   }

  //   const { error: pwErr } = await supabase.auth.updateUser({ password })
  //   if (pwErr) { setError(pwErr.message); setLoading(false); return }

  //   setLoading(false)
  //   router.replace('/')
  //   router.refresh()
  // }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError('Please choose Resident or Helper.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(null); setLoading(true)

    try {
      // 0. Get User
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { 
        router.replace('/login'); 
        return; 
      }

      // Sanitize variables to prevent DB constraint errors
      const safePhone = phone.trim() || null;

      // 1. ALWAYS update the profiles table FIRST to satisfy Foreign Keys
      const { error: profileErr } = await supabase.from('profiles').update({
        full_name: fullName.trim(), 
        phone: safePhone,
        flat_number: role === 'resident' ? (flat.trim() || null) : null,
        society_id: societyId, 
        role,
      }).eq('id', user.id)

      if (profileErr) throw new Error(`Profile Error: ${profileErr.message}`)

      // 2. ONLY THEN, if the user is a worker, insert into the workers table
      if (role === 'worker') {
        const rate = parseFloat(dailyRate || '0') || null
        const { error: wErr } = await supabase.from('workers').insert(
          {
            auth_id: user.id, 
            phone: safePhone, // <-- Using safePhone instead of falling back to email
            full_name: fullName.trim(), 
            specialty, 
            daily_rate: rate,
            society_id: societyId, 
            is_active: true,
          },
          { onConflict: 'auth_id' },
        )
        if (wErr) throw new Error(`Worker Setup Error: ${wErr.message}`)
      }

      // 3. Update the user password
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) throw new Error(`Password Error: ${pwErr.message}`)

      // 4. Success handling (THE FIX IS HERE)
      if (role === 'worker') {
        // Send workers to finish the second half of their profile
        router.replace('/worker-profile') 
      } else {
        // Send residents to the dashboard
        router.replace('/')
      }
      
      router.refresh()

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during onboarding.")
    } finally {
      setLoading(false)
    }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* ── Dark hero ── */}
      <div className="px-6 pt-16 pb-20">
        <div className="h-14 w-14 rounded-3xl bg-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-900/50">
          <span className="text-white font-black text-xl">SH</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">
          One last step
        </p>
        <h1 className="text-4xl font-black text-white leading-none tracking-tight">
          Set up your<br />account.
        </h1>
        <p className="mt-3 text-slate-400 text-sm">
          Signed in as <span className="text-slate-200 font-semibold">{userEmail}</span>
        </p>
      </div>

      {/* ── White form sheet ── */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 bg-white rounded-t-[2rem] px-6 pt-8 pb-16 space-y-5"
      >
        {/* Role */}
        <div>
          <SectionLabel>I am a…</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mt-3">
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
        </div>

        {/* Name + Phone */}
        <div className="space-y-4">
          <SectionLabel>About you</SectionLabel>
          <InputField
            label="Full name"
            value={fullName}
            onChange={setFullName}
            placeholder="Your full name"
          />
          <InputField
            label="Phone number"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="+91 98765 43210"
          />
          {societies.length > 0 && (
            <SelectField
              label="Society"
              value={societyId ?? ''}
              onChange={v => setSocietyId(v || null)}
              options={societies.map(s => ({ value: s.id, label: s.name }))}
            />
          )}
        </div>

        {/* Resident: flat */}
        {role === 'resident' && (
          <InputField
            label="Flat number"
            value={flat}
            onChange={setFlat}
            placeholder="A-204"
          />
        )}

        {/* Worker: specialty + rate */}
        {role === 'worker' && (
          <div className="space-y-4">
            <SectionLabel>Your specialty</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {SPECIALTIES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSpecialty(s.key)}
                  className={`rounded-2xl border-2 p-3 text-center transition ${
                    specialty === s.key
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <p className={`text-[11px] font-bold mt-1 ${
                    specialty === s.key ? 'text-violet-700' : 'text-slate-500'
                  }`}>
                    {s.label}
                  </p>
                </button>
              ))}
            </div>
            <InputField
              label="Daily rate (₹)"
              type="numeric"
              value={dailyRate}
              onChange={v => setDailyRate(v.replace(/\D/g, ''))}
              placeholder="500"
            />
          </div>
        )}

        {/* Password */}
        <div className="space-y-2">
          <SectionLabel>Set a password</SectionLabel>
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
          />
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-500" />
            You'll use this to sign in next time — no OTP needed.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !role || !fullName || password.length < 6}
          className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white text-[15px] font-bold shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : (
            <>Finish setup <ChevronRight size={16} /></>
          )}
        </button>
      </form>
    </div>
  )
}

/* ── Helpers ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{children}</p>
  )
}

const inputCls =
  'w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-violet-500 focus:bg-white'

function InputField({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={inputCls}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function RoleTile({
  active, onClick, icon: Icon, label, hint,
}: {
  active: boolean; onClick: () => void
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string; hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border-2 p-4 text-left transition ${
        active
          ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-3 ${
        active ? 'bg-violet-600' : 'bg-slate-100'
      }`}>
        <Icon size={20} className={active ? 'text-white' : 'text-slate-500'} />
      </div>
      <p className={`font-black text-sm ${active ? 'text-violet-700' : 'text-slate-900'}`}>
        {label}
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
    </button>
  )
}
