'use client'
/**
 * WorkerProfileForm — edits the signed-in worker's extended details.
 * Updates: bio, photo_url, upi_id.
 * Leaves name, specialty, and rate untouched from initial onboarding.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Image as ImageIcon, Wallet } from 'lucide-react'

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

  // Only keep state for the new information
  const [bio, setBio]           = useState(worker?.bio ?? '')
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

    // Only update the extended fields. 
    // Supabase will implicitly retain the name, rate, and specialty.
    const { error } = await supabase
      .from('workers')
      .update({
        bio: bio || null,
        photo_url: photoUrl || null,
        upi_id: upiId || null,
      })
      .eq('id', worker.id)

    setSaving(false)
    if (error) { setErr(error.message); return }
    
    setOk(true)
    
    // Redirect to the dashboard once they finish setting up their profile
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Public profile additions */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Public profile details</p>
        <p className="text-xs text-neutral-500 -mt-2">
          Add a bio and photo to help residents get to know you better.
        </p>

        <Field label="About me">
          <textarea className={`${inputCls} min-h-[88px] resize-y`}
            value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Brief intro residents will see in the directory." />
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
          {saving ? 'Saving…' : 'Finish Profile'}
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