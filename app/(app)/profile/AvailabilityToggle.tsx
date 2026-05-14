'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AvailabilityToggle({
  workerId, initialAvailable,
}: {
  workerId: string; initialAvailable: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()
  const [available, setAvailable] = useState(initialAvailable)
  const [loading, setLoading]     = useState(false)

  async function toggle() {
    setLoading(true)
    const next = !available
    setAvailable(next)
    await supabase.from('workers').update({ is_available: next }).eq('id', workerId)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`font-bold text-[15px] ${available ? 'text-emerald-600' : 'text-slate-500'}`}>
          {available ? '🟢 Available for work' : '🔴 Not available'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {available
            ? 'Residents can see and hire you'
            : 'You\'re hidden from hire requests'}
        </p>
      </div>
      <button onClick={toggle} disabled={loading}
        className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
          available ? 'bg-emerald-500' : 'bg-slate-200'
        } disabled:opacity-50`}>
        <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-200 ${
          available ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  )
}
