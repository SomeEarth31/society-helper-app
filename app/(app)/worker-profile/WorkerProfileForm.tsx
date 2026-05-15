'use client'
/**
 * WorkerProfileForm — edits the signed-in worker's full profile.
 * Uses upsert so it works whether the record already exists or not.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Image as ImageIcon, Wallet } from 'lucide-react'

type WorkerSpecialty = 'cook' | 'cleaner' | 'car_washer' | 'caretaker' | 'gardener' | 'maid' | 'other'

const SPECIALTIES: { key: WorkerSpecialty; label: string }[] = [
  { key: 'maid',       label: 'Maid'      },
  { key: 'cook',       label: 'Cook'      },
  { key: 'cleaner',    label: 'Cleaner'   },
  { key: 'car_washer', label: 'Car Wash'  },
  { key: 'caretaker',  label: 'Caretaker' },
  { key: 'gardener',   label: 'Gardener'  },
  { key: 'other',      label: 'Other'     },
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
  society_id: string | null
}

export default function WorkerProfileForm({
  worker,
  allSocieties,
  currentSocietyIds,
}: {
  worker: WorkerSelf | null
  allSocieties: { id: string; name: string }[]
  currentSocietyIds: string[]
}) {
  const router   = useRouter()
  const supabase = createClient()

  const isEditing = !!worker

  const [fullName,     setFullName]     = useState(worker?.full_name  ?? '')
  const [specialty,    setSpecialty]    = useState<WorkerSpecialty>((worker?.specialty as WorkerSpecialty) ?? 'maid')
  const [dailyRate,    setDailyRate]    = useState(worker?.daily_rate != null ? String(worker.daily_rate) : '')
  const [bio,          setBio]          = useState(worker?.bio        ?? '')
  const [photoUrl,     setPhoto]        = useState(worker?.photo_url  ?? '')
  const [upiId,        setUpi]          = useState(worker?.upi_id     ?? '')
  // If the worker has no society memberships, they are currently visible to everyone.
  const [visibleToAll, setVisibleToAll] = useState(currentSocietyIds.length === 0)
  const [checkedIds,   setCheckedIds]   = useState<string[]>(currentSocietyIds)
  const [newSociety,   setNewSociety]   = useState('')

  function toggleSociety(id: string) {
    setCheckedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const [saving, setSaving] = useState(false)
  const [ok,     setOk]     = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setOk(false); setSaving(true)

    if (!worker) {
      setErr('No worker record linked to your account. Please contact support.')
      setSaving(false); return
    }

    // Resolve final society IDs (skipped when visibleToAll is on)
    let finalIds: string[] = []
    if (!visibleToAll) {
      finalIds = [...checkedIds]
      if (newSociety.trim()) {
        const trimmed = newSociety.trim()
        const match   = allSocieties.find(
          s => s.name.trim().toLowerCase() === trimmed.toLowerCase()
        )
        if (match) {
          if (!finalIds.includes(match.id)) finalIds.push(match.id)
        } else {
          const { data: newSoc, error: socErr } = await supabase
            .from('societies').insert({ name: trimmed }).select('id').single()
          if (socErr) { setErr(socErr.message); setSaving(false); return }
          finalIds.push(newSoc.id)
        }
      }
    }

    // Update worker row
    const { error } = await supabase
      .from('workers')
      .update({
        full_name:  fullName  || worker.full_name,
        specialty,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        bio:        bio       || null,
        photo_url:  photoUrl  || null,
        upi_id:     upiId     || null,
        society_id: finalIds[0] ?? null,
      })
      .eq('id', worker.id)

    if (error) { setErr(error.message); setSaving(false); return }

    // Sync worker_societies: delete all, then re-insert unless visibleToAll
    await supabase.from('worker_societies').delete().eq('worker_id', worker.id)
    if (finalIds.length > 0) {
      await supabase.from('worker_societies').insert(
        finalIds.map(sid => ({ worker_id: worker.id, society_id: sid }))
      )
    }

    setSaving(false)
    setNewSociety('')
    setOk(true)
    router.push('/profile')
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Basic info */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Basic info</p>

        <Field label="Full name">
          <input
            className={inputCls}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </Field>

        <Field label="Specialty">
          <div className="grid grid-cols-4 gap-2 mt-1">
            {SPECIALTIES.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSpecialty(s.key)}
                className={`rounded-xl border-2 py-2 text-center text-[11px] font-bold transition ${
                  specialty === s.key
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Daily rate (₹)">
          <input
            className={inputCls}
            type="text"
            inputMode="numeric"
            value={dailyRate}
            onChange={e => setDailyRate(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 400"
          />
        </Field>
      </div>

      {/* Public profile */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Public profile</p>
        <p className="text-xs text-neutral-500 -mt-2">
          Add a bio and photo to help residents get to know you better.
        </p>

        <Field label="About me">
          <textarea
            className={`${inputCls} min-h-[88px] resize-y`}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Brief intro residents will see in the directory."
          />
        </Field>

        <Field label="Photo URL">
          <div className="relative">
            <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              className={`${inputCls} pl-8`}
              type="url"
              value={photoUrl}
              onChange={e => setPhoto(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </Field>
      </div>

      {/* Societies */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Where you work</p>

        {/* Visible-to-all toggle */}
        <button
          type="button"
          onClick={() => setVisibleToAll(v => !v)}
          className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
            visibleToAll ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
            visibleToAll ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300'
          }`}>
            {visibleToAll && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>}
          </span>
          <div>
            <p className={`text-sm font-bold ${visibleToAll ? 'text-emerald-800' : 'text-neutral-700'}`}>
              Visible to everyone
            </p>
            <p className={`text-xs mt-0.5 ${visibleToAll ? 'text-emerald-600' : 'text-neutral-400'}`}>
              Residents in all societies can find and hire you
            </p>
          </div>
        </button>

        {/* Specific societies — shown when visibleToAll is off */}
        {!visibleToAll && (
          <>
            <p className="text-xs text-neutral-500 -mt-1">
              Or select specific societies below.
              {allSocieties.length === 0 && ' None created yet — add yours below.'}
            </p>

            {allSocieties.length > 0 && (
              <div className="space-y-2">
                {allSocieties.map(s => {
                  const checked = checkedIds.includes(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSociety(s.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                        checked ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-200 bg-neutral-50'
                      }`}>
                      <span className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'bg-indigo-500 border-indigo-500' : 'border-neutral-300'
                      }`}>
                        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>}
                      </span>
                      <span className={`text-sm font-semibold ${checked ? 'text-indigo-800' : 'text-neutral-700'}`}>
                        {s.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <Field label="Add a society not listed above">
              <input className={inputCls} value={newSociety}
                onChange={e => setNewSociety(e.target.value)}
                placeholder="e.g. Jaypee Kosmos" />
            </Field>
            {newSociety.trim() && (
              <p className="text-[11px] text-indigo-600 font-medium -mt-2">
                {allSocieties.find(s => s.name.trim().toLowerCase() === newSociety.trim().toLowerCase())
                  ? '✓ Matches an existing society'
                  : '✨ A new society will be created'}
              </p>
            )}
          </>
        )}
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
          <input
            className={inputCls}
            value={upiId}
            onChange={e => setUpi(e.target.value)}
            placeholder="yourname@okhdfc"
          />
        </Field>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : isEditing ? 'Update Profile' : 'Finish Setup'}
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
