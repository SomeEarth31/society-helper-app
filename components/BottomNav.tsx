'use client'
/**
 * Bottom Navigation — clear active states, notification badge, mobile-first.
 */
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Briefcase, User, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type Role = 'resident' | 'worker' | 'admin'

export default function BottomNav({
  role = 'resident',
  unreadMessages = 0,
  pendingHireRequests = 0,
  unreadJobNotifications = 0,
}: {
  role?: Role
  unreadMessages?: number
  pendingHireRequests?: number
  unreadJobNotifications?: number
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const { T }    = useLanguage()
  const isWorker = role === 'worker'

  const RESIDENT_TABS = [
    { href: '/',        label: T.nav.home,    icon: Home,          badgeCount: 0 },
    { href: '/jobs',    label: T.nav.jobs,    icon: Briefcase,     badgeCount: unreadJobNotifications },
    { href: '/chat',    label: T.nav.chat,    icon: MessageCircle, badgeCount: unreadMessages },
    { href: '/profile', label: T.nav.profile, icon: User,          badgeCount: 0 },
  ]

  const WORKER_TABS = [
    { href: '/',          label: T.nav.home,     icon: Home,          badgeCount: 0 },
    { href: '/directory', label: T.nav.findJobs, icon: Briefcase,     badgeCount: 0 },
    { href: '/chat',      label: T.nav.chat,     icon: MessageCircle, badgeCount: unreadMessages },
    { href: '/profile',   label: T.nav.account,  icon: User,          badgeCount: 0 },
  ]

  const tabs = isWorker ? WORKER_TABS : RESIDENT_TABS

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] pb-safe">
      <ul className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon, badgeCount }) => {
          const active   = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const hasBadge = badgeCount > 0

          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => router.refresh()}
                className="relative flex flex-col items-center justify-center h-full gap-0.5"
              >
                {/* Active bar */}
                {active && (
                  <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full ${
                    isWorker ? 'bg-emerald-600' : 'bg-violet-600'
                  }`} />
                )}

                {/* Icon wrapper */}
                <div className={`relative flex items-center justify-center w-11 h-8 rounded-xl transition-all ${
                  active ? (isWorker ? 'bg-emerald-50' : 'bg-violet-50') : ''
                }`}>
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={active ? (isWorker ? 'text-emerald-600' : 'text-violet-600') : 'text-slate-400'}
                  />
                  {hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>

                <span className={`text-[11px] font-bold ${
                  active ? (isWorker ? 'text-emerald-600' : 'text-violet-600') : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
