'use client'
/**
 * WorkerProfileForm — edits the signed-in worker's directory listing.
 * Updates: full_name, specialty, bio, daily_rate, photo_url, upi_id.
 *
 * Relies on the RLS policy `workers_self_update` (auth_id = auth.uid()).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, IndianRupee, Image as ImageIcon, Wallet } from 'lucide-react'

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

type WorkerSelf = {
  id: string
  full_name: string
  specialty: string
  bio: string | null
  daily_rate: number | null
  photo_url: string | null
  upi_id: string | null
  phone: string | null
}

export default function WorkerProfileForm({ worker }: { worker: WorkerSelf | null }) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState(worker?.full_name ?? '')
  const [specialty, setSpecialty] = useState<Specialty>((worker?.specialty as Specialty) ?? 'maid')
  const [bio, setBio]           = useState(worker?.bio ?? '')
  const [dailyRate, setRate]    = useState(worker?.daily_rate?.toString() ?? '')
  const [photoUrl, setPhoto]    = useState(worker?.photo_url ?? '')
  const [upiId, setUpi]         = useState(worker?.upi_id ?? '')

  const [saving, setSaving] = useState(false)
  const [ok, setOk]         = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setOk(false); setSaving(true)

    if (!worker) {
      setErr('No worker record linked to your account yet.')
      setSaving(false); return
    }

    const { error } = await supabase
      .from('workers')
      .update({
        full_name: fullName,
        specialty,
        bio: bio || null,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        photo_url: photoUrl || null,
        upi_id: upiId || null,
      })
      .eq('id', worker.id)

    setSaving(false)
    if (error) { setErr(error.message); return }
    setOk(true)
    router.refresh()
    setTimeout(() => setOk(false), 2200)
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Public profile */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Public profile</p>

        <Field label="Display name">
          <input className={inputCls} required
            value={fullName} onChange={e => setFullName(e.target.value)} />
        </Field>

        <Field label="Specialty">
          <select className={inputCls}
            value={specialty} onChange={e => setSpecialty(e.target.value as Specialty)}>
            {SPECIALTIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>

        <Field label="About me">
          <textarea className={`${inputCls} min-h-[88px] resize-y`}
            value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Brief intro residents will see in the directory." />
        </Field>

        <Field label="Daily rate (₹)">
          <div className="relative">
            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input className={`${inputCls} pl-8`} inputMode="numeric"
              value={dailyRate} onChange={e => setRate(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="500" />
          </div>
        </Field>

        <Field label="Photo URL">
          <div className="relative">
            <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input className={`${inputCls} pl-8`} type="url"
              value={photoUrl} onChange={e => setPhoto(e.target.value)}
              placeholder="https://…" />
          </div>
        </Field>
      </div>

      {/* Payment info */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-indigo-600" />
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Payment info</p>
        </div>
        <p className="text-xs text-neutral-500 -mt-2">
          Your UPI ID is shown to residents so they can pay you directly.
        </p>
        <Field label="UPI ID">
          <input className={inputCls}
            value={upiId} onChange={e => setUpi(e.target.value)}
            placeholder="yourname@okhdfc" />
        </Field>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700 disabled:opacity-60">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {ok && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
      {err && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>
      )}
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
