'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus } from 'lucide-react'

export default function ResidentEditForm({
  initialData,
  allSocieties,
}: {
  initialData: {
    full_name:   string | null
    flat_number: string | null
    phone:       string | null
    upi_id:      string | null
    society_id:  string | null
    bio:         string | null
  }
  allSocieties: { id: string; name: string }[]
}) {
  const supabase = createClient()
  const router   = useRouter()

  const [fullName,    setFullName]    = useState(initialData.full_name    ?? '')
  const [flatNumber,  setFlatNumber]  = useState(initialData.flat_number  ?? '')
  const [upiId,       setUpiId]       = useState(initialData.upi_id       ?? '')
  const [bio,         setBio]         = useState(initialData.bio          ?? '')
  const [societyId,   setSocietyId]   = useState<string | null>(initialData.society_id)
  const [newSociety,  setNewSociety]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  async function resolveOrCreateSociety(name: string): Promise<string> {
    const trimmed = name.trim()
    const match = allSocieties.find(s => s.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (match) return match.id
    const { data, error } = await supabase
      .from('societies').insert({ name: trimmed }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setSaving(true)

    try {
      let resolvedSocietyId = societyId
      if (newSociety.trim()) {
        resolvedSocietyId = await resolveOrCreateSociety(newSociety)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:   fullName   || null,
          flat_number: flatNumber || null,
          upi_id:      upiId      || null,
          bio:         bio        || null,
          society_id:  resolvedSocietyId,
        })
        .eq('id', user.id)

      if (error) throw new Error(error.message)

      router.push('/profile')
      router.refresh()
    } catch (e: any) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Basic info */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Basic info</p>

        <Field label="Full name">
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="Your full name" className={inputCls} />
        </Field>

        <Field label="Flat / apartment number">
          <input value={flatNumber} onChange={e => setFlatNumber(e.target.value)}
            placeholder="e.g. A-204" className={inputCls} />
        </Field>

        <Field label="Phone (read-only)">
          <input value={initialData.phone ?? ''} disabled
            className={`${inputCls} opacity-50 cursor-not-allowed`} />
        </Field>

        <Field label="Bio">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="A short intro that helpers will see on your profile…"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      {/* Society */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Society</p>

        {allSocieties.length > 0 && (
          <Field label="Your society">
            <select value={societyId ?? ''} onChange={e => setSocietyId(e.target.value || null)}
              className={inputCls}>
              <option value="">— select your society —</option>
              {allSocieties.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label={allSocieties.length > 0 ? 'Or add a new society' : 'Society name'}>
          <div className="relative">
            <Plus size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={newSociety} onChange={e => setNewSociety(e.target.value)}
              placeholder="Type society name…"
              className={`${inputCls} pl-8`} />
          </div>
        </Field>
        {newSociety.trim() && (
          <p className="text-[11px] text-indigo-600 font-medium -mt-2">
            {allSocieties.find(s => s.name.trim().toLowerCase() === newSociety.trim().toLowerCase())
              ? '✓ Matches an existing society'
              : '✨ A new society will be created'}
          </p>
        )}
      </div>

      {/* Payment */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Payment</p>
        <Field label="UPI ID">
          <input value={upiId} onChange={e => setUpiId(e.target.value)}
            placeholder="yourname@okhdfc" className={inputCls} />
        </Field>
      </div>

      {err && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>
      )}

      <button type="submit" disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}

const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  )
}
