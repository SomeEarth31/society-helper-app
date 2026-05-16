'use client'
/**
 * OnboardingForm — first-time setup.
 *
 * Society rules:
 *  Resident  → picks ONE society from the dropdown, OR types a new name
 *              (case-insensitive dedup)
 *  Worker    → "Visible to everyone" toggle (default) OR selects specific societies
 *              Workers with no societies selected are still visible to all residents.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home as HomeIcon, HardHat, Loader2, CheckCircle2, ChevronRight, Plus, Image as ImageIcon, Wallet } from 'lucide-react'

type Role      = 'resident' | 'worker'
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

  // ── Common ──────────────────────────────────────────────────
  const [role,      setRole]     = useState<Role | null>(null)
  const [fullName,  setFullName] = useState('')
  const [phone,     setPhone]    = useState('')
  const [password,  setPassword] = useState('')
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState<string | null>(null)

  // ── Resident-specific ────────────────────────────────────────
  const [flat,           setFlat]          = useState('')
  const [resSocietyId,   setResSocietyId]  = useState<string | null>(defaultSocietyId)
  const [resNewSociety,  setResNewSociety] = useState('')
  const [resBio,         setResBio]        = useState('')
  const [resUpiId,       setResUpiId]      = useState('')

  // ── Worker-specific ──────────────────────────────────────────
  const [specialty,        setSpecialty]       = useState<Specialty>('maid')
  const [dailyRate,        setDailyRate]        = useState('')
  const [bio,              setBio]              = useState('')
  const [photoUrl,         setPhotoUrl]         = useState('')
  const [upiId,            setUpiId]            = useState('')
  const [visibleToAll,     setVisibleToAll]     = useState(true)
  const [wrkCheckedIds,    setWrkCheckedIds]    = useState<string[]>([])
  const [wrkNewSociety,    setWrkNewSociety]    = useState('')

  function toggleSociety(id: string) {
    setWrkCheckedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── Shared helper: find or create a society by name ──────────
  async function resolveOrCreateSociety(name: string): Promise<string> {
    const trimmed = name.trim()
    const match   = societies.find(
      s => s.name.trim().toLowerCase() === trimmed.toLowerCase()
    )
    if (match) return match.id
    const { data, error } = await supabase
      .from('societies')
      .insert({ name: trimmed })
      .select('id')
      .single()
    if (error) throw new Error(`Society error: ${error.message}`)
    return data.id
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError('Please choose Resident or Helper.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(null); setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const safePhone = phone.trim() || null

      // ── Resolve society for resident ─────────────────────────
      let resolvedSocietyId: string | null = null
      if (role === 'resident') {
        if (resNewSociety.trim()) {
          resolvedSocietyId = await resolveOrCreateSociety(resNewSociety)
        } else {
          resolvedSocietyId = resSocietyId
        }
      }

      // ── Resolve societies list for worker ────────────────────
      let finalWorkerSocietyIds: string[] = []
      if (role === 'worker' && !visibleToAll) {
        finalWorkerSocietyIds = [...wrkCheckedIds]
        if (wrkNewSociety.trim()) {
          const newId = await resolveOrCreateSociety(wrkNewSociety)
          if (!finalWorkerSocietyIds.includes(newId)) {
            finalWorkerSocietyIds.push(newId)
          }
        }
      }

      // ── 1. Update profiles ───────────────────────────────────
      const { error: profileErr } = await supabase.from('profiles').update({
        full_name:   fullName.trim(),
        phone:       safePhone,
        flat_number: role === 'resident' ? (flat.trim() || null) : null,
        society_id:  resolvedSocietyId,
        bio:         role === 'resident' ? (resBio.trim() || null) : null,
        upi_id:      role === 'resident' ? (resUpiId.trim() || null) : null,
        role,
      }).eq('id', user.id)
      if (profileErr) throw new Error(`Profile Error: ${profileErr.message}`)

      // ── 2. Insert worker row ─────────────────────────────────
      if (role === 'worker') {
        const rate = parseFloat(dailyRate || '0') || null
        const primarySocietyId = finalWorkerSocietyIds[0] ?? null

        const { data: workerData, error: wErr } = await supabase
          .from('workers')
          .insert({
            auth_id:    user.id,
            phone:      safePhone,
            full_name:  fullName.trim(),
            specialty,
            daily_rate: rate,
            bio:        bio.trim() || null,
            photo_url:  photoUrl.trim() || null,
            upi_id:     upiId.trim() || null,
            society_id: primarySocietyId,
            is_active:  true,
          })
          .select('id')
          .single()
        if (wErr) throw new Error(`Worker Setup Error: ${wErr.message}`)

        // ── 3. Populate worker_societies (only if not visible to all) ─
        if (finalWorkerSocietyIds.length > 0) {
          const rows = finalWorkerSocietyIds.map(sid => ({
            worker_id:  workerData.id,
            society_id: sid,
          }))
          const { error: wsErr } = await supabase
            .from('worker_societies')
            .insert(rows)
          if (wsErr) throw new Error(`Society link error: ${wsErr.message}`)
        }
      }

      // ── 4. Set password ──────────────────────────────────────
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) throw new Error(`Password Error: ${pwErr.message}`)

      // ── 5. Redirect ──────────────────────────────────────────
      router.replace('/')
      router.refresh()

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during onboarding.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Hero */}
      <div className="px-6 pt-16 pb-20">
        <div className="h-14 w-14 rounded-3xl bg-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-900/50">
          <span className="text-white font-black text-xl">SH</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">One last step</p>
        <h1 className="text-4xl font-black text-white leading-none tracking-tight">
          Set up your<br />account.
        </h1>
        <p className="mt-3 text-slate-400 text-sm">
          Signed in as <span className="text-slate-200 font-semibold">{userEmail}</span>
        </p>
      </div>

      {/* Form sheet */}
      <form onSubmit={handleSubmit} className="flex-1 bg-white rounded-t-[2rem] px-6 pt-8 pb-16 space-y-6">

        {/* Role */}
        <div>
          <SectionLabel>I am a…</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <RoleTile active={role === 'resident'} onClick={() => setRole('resident')}
              icon={HomeIcon} label="Resident" hint="I hire helpers" />
            <RoleTile active={role === 'worker'} onClick={() => setRole('worker')}
              icon={HardHat} label="Helper" hint="I look for work" />
          </div>
        </div>

        {/* Name + Phone */}
        <div className="space-y-4">
          <SectionLabel>About you</SectionLabel>
          <InputField label="Full name"     value={fullName} onChange={setFullName} placeholder="Your full name" />
          <InputField label="Phone number"  value={phone}    onChange={setPhone}    placeholder="+91 98765 43210" type="tel" />
        </div>

        {/* Resident fields */}
        {role === 'resident' && (
          <div className="space-y-4">
            <SectionLabel>Your home</SectionLabel>
            <InputField label="Flat / apartment number" value={flat} onChange={setFlat} placeholder="A-204" />
            <ResidentSocietyPicker
              societies={societies}
              selectedId={resSocietyId}
              onSelect={setResSocietyId}
              newValue={resNewSociety}
              onNewChange={setResNewSociety}
            />
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 mb-1.5">About me (bio, optional)</span>
              <textarea
                value={resBio}
                onChange={e => setResBio(e.target.value)}
                placeholder="A short intro that helpers will see on your profile…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </label>
            <InputField label="UPI ID (optional)" value={resUpiId} onChange={setResUpiId} placeholder="yourname@okhdfc" />
          </div>
        )}

        {/* Worker fields */}
        {role === 'worker' && (
          <div className="space-y-5">
            {/* Specialty */}
            <div>
              <SectionLabel>Your specialty</SectionLabel>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {SPECIALTIES.map(s => (
                  <button key={s.key} type="button" onClick={() => setSpecialty(s.key)}
                    className={`rounded-2xl border-2 p-3 text-center transition ${
                      specialty === s.key
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}>
                    <span className="text-2xl">{s.emoji}</span>
                    <p className={`text-[11px] font-bold mt-1 ${specialty === s.key ? 'text-violet-700' : 'text-slate-500'}`}>
                      {s.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Rate */}
            <InputField label="Daily rate (₹)" type="number" value={dailyRate}
              onChange={v => setDailyRate(v.replace(/\D/g, ''))} placeholder="500" />

            {/* Bio */}
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 mb-1.5">About me (bio)</span>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Brief intro residents will see in the directory…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </label>

            {/* Photo URL */}
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 mb-1.5">Photo URL (optional)</span>
              <div className="relative">
                <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="https://…"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </label>

            {/* UPI */}
            <label className="block">
              <span className="block text-xs font-bold text-slate-500 mb-1.5">
                <span className="inline-flex items-center gap-1.5"><Wallet size={12} /> UPI ID (optional)</span>
              </span>
              <input
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="yourname@okhdfc"
                className={inputCls}
              />
            </label>

            {/* Visibility / societies */}
            <div className="space-y-3">
              <SectionLabel>Where you work</SectionLabel>

              {/* Visible-to-all toggle */}
              <button
                type="button"
                onClick={() => setVisibleToAll(v => !v)}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition ${
                  visibleToAll ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'
                }`}
              >
                <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  visibleToAll ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                }`}>
                  {visibleToAll && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>}
                </span>
                <div>
                  <p className={`text-sm font-bold ${visibleToAll ? 'text-emerald-800' : 'text-slate-700'}`}>
                    Visible to everyone
                  </p>
                  <p className={`text-xs mt-0.5 ${visibleToAll ? 'text-emerald-600' : 'text-slate-400'}`}>
                    Residents in all societies can find and hire you
                  </p>
                </div>
              </button>

              {/* Specific societies */}
              {!visibleToAll && (
                <WorkerSocietyPicker
                  societies={societies}
                  checkedIds={wrkCheckedIds}
                  onToggle={toggleSociety}
                  newValue={wrkNewSociety}
                  onNewChange={setWrkNewSociety}
                />
              )}
            </div>
          </div>
        )}

        {/* Password */}
        <div className="space-y-2">
          <SectionLabel>Set a password</SectionLabel>
          <InputField label="Password" type="password" value={password} onChange={setPassword}
            placeholder="At least 6 characters" />
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

        <button type="submit"
          disabled={loading || !role || !fullName || password.length < 6}
          className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white text-[15px] font-bold shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40">
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <> Finish setup <ChevronRight size={16} /></>}
        </button>
      </form>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Resident society picker
───────────────────────────────────────────────────────────── */
function ResidentSocietyPicker({
  societies, selectedId, onSelect, newValue, onNewChange,
}: {
  societies: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  newValue: string
  onNewChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-bold text-slate-500">Society / building</span>

      {societies.length > 0 && (
        <select
          value={selectedId ?? ''}
          onChange={e => onSelect(e.target.value || null)}
          className={inputCls}
        >
          <option value="">— select your society —</option>
          {societies.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      <div className="relative">
        <Plus size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={newValue}
          onChange={e => onNewChange(e.target.value)}
          placeholder={societies.length > 0 ? 'Not listed? Type your society name' : 'Type your society name'}
          className={`${inputCls} pl-8`}
        />
      </div>
      {newValue.trim() && (
        <p className="text-[11px] text-violet-600 font-medium pl-1">
          {societies.find(s => s.name.trim().toLowerCase() === newValue.trim().toLowerCase())
            ? '✓ Matches an existing society — will be linked automatically'
            : '✨ A new society will be created with this name'}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Worker society picker (shown when visibleToAll is off)
───────────────────────────────────────────────────────────── */
function WorkerSocietyPicker({
  societies, checkedIds, onToggle, newValue, onNewChange,
}: {
  societies: { id: string; name: string }[]
  checkedIds: string[]
  onToggle: (id: string) => void
  newValue: string
  onNewChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400">
        Select societies you work in. You can update this later.
        {societies.length === 0 && ' No societies yet — add yours below.'}
      </p>

      {societies.length > 0 && (
        <div className="space-y-2">
          {societies.map(s => {
            const checked = checkedIds.includes(s.id)
            return (
              <button key={s.id} type="button" onClick={() => onToggle(s.id)}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                  checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'
                }`}>
                <span className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                  checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                }`}>
                  {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>}
                </span>
                <span className={`text-sm font-semibold ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {s.name}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="relative">
        <Plus size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={newValue}
          onChange={e => onNewChange(e.target.value)}
          placeholder="Add a society not listed above"
          className={`${inputCls} pl-8`}
        />
      </div>
      {newValue.trim() && (
        <p className="text-[11px] text-emerald-600 font-medium pl-1">
          {societies.find(s => s.name.trim().toLowerCase() === newValue.trim().toLowerCase())
            ? '✓ Matches an existing society — will be linked automatically'
            : '✨ A new society will be created with this name'}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Shared UI helpers
───────────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-black uppercase tracking-widest text-slate-400">{children}</p>
}

const inputCls =
  'w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-violet-500 focus:bg-white'

function InputField({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className={inputCls} />
    </label>
  )
}

function RoleTile({ active, onClick, icon: Icon, label, hint }: {
  active: boolean; onClick: () => void
  icon: React.ElementType
  label: string; hint: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-3xl border-2 p-4 text-left transition ${
        active ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100' : 'border-slate-100 bg-white hover:border-slate-200'
      }`}>
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-3 ${active ? 'bg-violet-600' : 'bg-slate-100'}`}>
        <Icon size={20} className={active ? 'text-white' : 'text-slate-500'} />
      </div>
      <p className={`font-black text-sm ${active ? 'text-violet-700' : 'text-slate-900'}`}>{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
    </button>
  )
}
