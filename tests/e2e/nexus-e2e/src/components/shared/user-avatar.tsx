'use client'

// Shared component: user-avatar
// User avatar with name tooltip and online indicator
// Used by: editorial-queue, review-panel, users-admin

interface UserAvatarProps {
  name?: string
  avatarUrl?: string
  online?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
}

export function UserAvatar({ name, avatarUrl, online = false, size = 'md' }: UserAvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="relative inline-flex" title={name}>
      <div className={`${SIZE_CLASSES[size]} flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium overflow-hidden`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name ?? 'User'} className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-white" />
      )}
    </div>
  )
}
