'use client'
/**
 * EndEngagementButton — confirmation modal before terminating an engagement.
 * Supports both resident (fire) and worker (leave) roles.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, UserMinus, Loader2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function EndEngagementButton({
  engagementId,
  role,
  otherName,
}: {
  engagementId: string
  role: 'resident' | 'worker'
  otherName: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const { T }    = useLanguage()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  const isResident = role === 'resident'
  const label      = isResident ? T.engagement.endEngagement : T.engagement.leaveJob
  const Icon       = isResident ? UserMinus : LogOut

  const confirmLabel   = isResident ? T.engagement.confirmFire(otherName) : T.engagement.confirmLeave
  const confirmMessage = isResident
    ? T.engagement.endConfirm(otherName)
    : T.engagement.leaveConfirm(otherName)

  async function handleConfirm() {
    setLoading(true)
    await supabase.from('engagements')
      .update({ status: 'terminated' })
      .eq('id', engagementId)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex-1 h-10 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition ${
          isResident
            ? 'border-red-200 text-red-600'
            : 'border-slate-200 text-slate-500'
        }`}
      >
        <Icon size={14} /> {label}
      </button>

      {/* Confirmation modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm bg-white rounded-3xl px-5 pt-5 pb-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-black text-slate-900">{label}?</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{confirmMessage}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm active:scale-95 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-red-100 active:scale-95 transition disabled:opacity-40"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <><Icon size={15} /> {confirmLabel}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
