'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MarkAllRead({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleMarkAll() {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
    router.refresh()
  }

  return (
    <button onClick={handleMarkAll} className="text-xs font-bold text-violet-600 min-h-[36px]">
      Mark all read
    </button>
  )
}
