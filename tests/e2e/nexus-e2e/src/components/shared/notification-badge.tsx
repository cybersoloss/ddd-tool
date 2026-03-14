'use client'

// Shared component: notification-badge
// Badge showing unread notification count with dropdown preview
// Used by: dashboard, editorial-queue
import { Bell } from 'lucide-react'

interface NotificationBadgeProps {
  count?: number
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (!count || count === 0) return null
  return (
    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function NotificationBell({ count }: NotificationBadgeProps) {
  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {count != null && count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  )
}
