'use client'
/**
 * Bottom Navigation — mobile-native UX pattern.
 * Sticks to the bottom on all (app) routes via app/(app)/layout.tsx.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Wallet, User } from 'lucide-react'

const TABS = [
  { href: '/',          label: 'Home',      icon: Home },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/payments',  label: 'Payments',  icon: Wallet },
  { href: '/profile',   label: 'Profile',   icon: User },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-neutral-200 pb-safe">
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                  active ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className={active ? 'font-semibold' : ''}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
