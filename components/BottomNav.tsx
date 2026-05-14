'use client'
/**
 * Bottom Navigation — Urban Company / Uber style.
 * Active tab: violet/emerald icon + label + pill indicator at top.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Wallet, User, Briefcase, BadgeIndianRupee } from 'lucide-react'

type Role = 'resident' | 'worker' | 'admin'

const RESIDENT_TABS = [
  { href: '/',          label: 'Home',      icon: Home },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/payments',  label: 'Payments',  icon: Wallet },
  { href: '/profile',   label: 'Profile',   icon: User },
] as const

const WORKER_TABS = [
  { href: '/',               label: 'Home',     icon: Home },
  { href: '/directory',      label: 'Jobs',     icon: Briefcase },
  { href: '/payments',       label: 'Earnings', icon: BadgeIndianRupee },
  { href: '/worker-profile', label: 'Account',  icon: User },
] as const

export default function BottomNav({ role = 'resident' }: { role?: Role }) {
  const pathname = usePathname()
  const tabs = role === 'worker' ? WORKER_TABS : RESIDENT_TABS
  const accent = role === 'worker' ? 'text-emerald-600' : 'text-violet-600'
  const bar    = role === 'worker' ? 'bg-emerald-500' : 'bg-violet-600'

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-100 shadow-[0_-1px_0_0_#f1f5f9,0_-8px_24px_rgba(0,0,0,0.06)] pb-safe">
      <ul className="grid grid-cols-4 h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link href={href} className="relative flex flex-col items-center justify-center h-full gap-1">
                {/* Active indicator */}
                {active && (
                  <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full ${bar}`} />
                )}
                <Icon
                  size={21}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? accent : 'text-slate-300'}
                />
                <span
                  className={`text-[11px] font-bold ${active ? accent : 'text-slate-300'}`}
                >
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
