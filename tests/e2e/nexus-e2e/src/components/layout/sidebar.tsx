'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, ClipboardCheck, Send, Rss,
  BarChart2, Users, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/shared/notification-badge'

const navItems = [
  { href: '/',                label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/content',         label: 'Content',    icon: FileText },
  { href: '/editorial',       label: 'Editorial',  icon: ClipboardCheck, badge: 'pending_reviews' },
  { href: '/publishing',      label: 'Publishing', icon: Send },
  { href: '/sources',         label: 'Sources',    icon: Rss },
  { href: '/analytics',       label: 'Analytics',  icon: BarChart2 },
  { href: '/admin/users',     label: 'Users',      icon: Users },
  { href: '/settings/general', label: 'Settings',  icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex w-60 flex-col border-r bg-white px-3 py-4">
      <div className="mb-6 px-3">
        <h1 className="text-xl font-bold text-primary">Nexus</h1>
        <p className="text-xs text-muted-foreground">Content Intelligence</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
              {badge === 'pending_reviews' && <NotificationBadge />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
