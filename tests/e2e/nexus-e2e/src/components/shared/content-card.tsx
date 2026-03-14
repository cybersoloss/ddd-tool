'use client'

// Shared component: content-card
// Displays a content item with title, status badge, category, quality score, and source info
// Used by: content-feed, editorial-queue, dashboard

interface ContentCardProps {
  title: string
  status: string
  category: string
  qualityScore?: number | null
  sourceType?: string
  createdAt?: string
  onClick?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  published: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
}

export function ContentCard({ title, status, category, qualityScore, sourceType, createdAt, onClick }: ContentCardProps) {
  return (
    <div
      className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
          {status}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="capitalize">{category}</span>
        {sourceType && <span>· {sourceType}</span>}
        {qualityScore != null && (
          <span className="ml-auto font-medium text-foreground">Q: {(qualityScore * 100).toFixed(0)}%</span>
        )}
      </div>
      {createdAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
