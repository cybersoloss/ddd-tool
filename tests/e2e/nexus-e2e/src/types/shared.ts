// Shared enums and value objects from specs/shared/types.yaml

export const ContentCategory = {
  NEWS: 'news',
  OPINION: 'opinion',
  RESEARCH: 'research',
  OTHER: 'other',
} as const
export type ContentCategory = (typeof ContentCategory)[keyof typeof ContentCategory]

export const ContentStatus = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus]

export const SourceType = {
  RSS: 'rss',
  WEB: 'web',
  CSV: 'csv',
  WEBHOOK: 'webhook',
  SOCIAL: 'social',
  FILESYSTEM: 'filesystem',
} as const
export type SourceType = (typeof SourceType)[keyof typeof SourceType]

export const ChannelType = {
  WEBSITE: 'website',
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
  NEWSLETTER: 'newsletter',
  WEBHOOK: 'webhook',
} as const
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType]

export const UserPlan = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const
export type UserPlan = (typeof UserPlan)[keyof typeof UserPlan]

export const RuleType = {
  INGESTION: 'ingestion',
  ROUTING: 'routing',
  PUBLISHING: 'publishing',
} as const
export type RuleType = (typeof RuleType)[keyof typeof RuleType]

export const PublishStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const
export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus]

export const ScheduleStatus = {
  PENDING: 'pending',
  EXECUTED: 'executed',
  CANCELLED: 'cancelled',
} as const
export type ScheduleStatus = (typeof ScheduleStatus)[keyof typeof ScheduleStatus]

export const NotificationType = {
  EMAIL: 'email',
  SLACK: 'slack',
  PUSH: 'push',
  IN_APP: 'in_app',
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const DigestFrequency = {
  REALTIME: 'realtime',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const
export type DigestFrequency = (typeof DigestFrequency)[keyof typeof DigestFrequency]

export const EventTypeCategory = {
  CONTENT: 'content',
  USER: 'user',
  SYSTEM: 'system',
  PUBLISHING: 'publishing',
  EDITORIAL: 'editorial',
} as const
export type EventTypeCategory = (typeof EventTypeCategory)[keyof typeof EventTypeCategory]

// Pagination types
export interface PaginatedResponse<T> {
  data: T[]
  cursor: string | null
  has_more: boolean
}

// Auth types
export interface JwtPayload {
  sub: string
  email: string
  role: string
  plan: UserPlan
  iat: number
  exp: number
}

// Content status transition validation
const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ['review'],
  review: ['approved', 'rejected'],
  approved: ['published'],
  published: ['archived'],
  rejected: ['draft'],
  archived: [],
}

export function isValidContentTransition(from: ContentStatus, to: ContentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
