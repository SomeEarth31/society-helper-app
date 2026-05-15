'use client'
/**
 * InviteWorkersButton — opens WhatsApp with a pre-written invite message.
 * The app URL is read from NEXT_PUBLIC_APP_URL env variable.
 */
import { Share2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://societyhelper.app'

export default function InviteWorkersButton() {
  const { T } = useLanguage()

  function handleInvite() {
    const message = T.resident.inviteMessage(APP_URL)
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  return (
    <button
      onClick={handleInvite}
      className="flex items-center gap-2 bg-emerald-500 text-white text-[13px] font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-100 active:scale-95 transition"
    >
      <Share2 size={14} />
      {T.resident.inviteWorkers}
    </button>
  )
}
