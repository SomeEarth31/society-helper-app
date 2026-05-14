'use client'
/**
 * Bottom Navigation — clear active states, notification badge, mobile-first.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Wallet, User, BadgeIndianRupee, MessageCircle } from 'lucide-react'

type Role = 'resident' | 'worker' | 'admin'

const RESIDENT_TABS = [
  { href: '/',         label: 'Home',     icon: Home,              badge: false },
  { href: '/jobs',     label: 'Jobs',     icon: Briefcase,         badge: false },
  { href: '/chat',     label: 'Chat',     icon: MessageCircle,     badge: true  },
  { href: '/profile',  label: 'Profile',  icon: User,              badge: false },
] as const

const WORKER_TABS = [
  { href: '/',                label: 'Home',     icon: Home,          badge: false },
  { href: '/directory',       label: 'Find Jobs', icon: Briefcase,    badge: false },
  { href: '/hire-requests',   label: 'Requests', icon: MessageCircle, badge: true  },
  { href: '/profile',         label: 'Account',  icon: User,          badge: false },
] as const

export default function BottomNav({
  role = 'resident',
  unreadMessages = 0,
}: {
  role?: Role
  unreadMessages?: number
}) {
  const pathname = usePathname()
  const tabs = role === 'worker' ? WORKER_TABS : RESIDENT_TABS
  const isWorker = role === 'worker'

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] pb-safe">
      <ul className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const hasBadge = badge && unreadMessages > 0

          return (
            <li key={href}>
              <Link href={href} className="relative flex flex-col items-center justify-center h-full gap-0.5">

                {/* Active bar */}
                {active && (
                  <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full ${
                    isWorker ? 'bg-emerald-600' : 'bg-violet-600'
                  }`} />
                )}

                {/* Icon wrapper */}
                <div className={`relative flex items-center justify-center w-11 h-8 rounded-xl transition-all ${
                  active
                    ? isWorker ? 'bg-emerald-50' : 'bg-violet-50'
                    : ''
                }`}>
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={
                      active
                        ? isWorker ? 'text-emerald-600' : 'text-violet-600'
                        : 'text-slate-400'
                    }
                  />
                  {hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>

                <span className={`text-[11px] font-bold ${
                  active
                    ? isWorker ? 'text-emerald-600' : 'text-violet-600'
                    : 'text-slate-400'
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
