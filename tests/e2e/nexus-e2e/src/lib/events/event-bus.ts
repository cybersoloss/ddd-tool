// In-memory event bus for development; swap for Redis-backed queue in production
import { EventEmitter } from 'events'
import { logger } from '@/utils/logger'

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>

class EventBus extends EventEmitter {
  emit<T>(event: string, payload: T): boolean {
    logger.debug({ event, payload }, 'EventBus emit')
    return super.emit(event, payload)
  }

  on<T>(event: string, handler: EventHandler<T>): this {
    return super.on(event, handler as (...args: any[]) => void)
  }

  once<T>(event: string, handler: EventHandler<T>): this {
    return super.once(event, handler as (...args: any[]) => void)
  }
}

export const eventBus = new EventBus()
eventBus.setMaxListeners(50)

// Domain event names
export const DomainEvents = {
  // Ingestion domain
  CONTENT_INGESTED: 'ContentIngested',
  RSS_BATCH_COMPLETE: 'RssBatchComplete',

  // Processing domain
  CONTENT_CLASSIFIED: 'ContentClassified',
  CONTENT_ENRICHED: 'ContentEnriched',

  // Editorial domain
  CONTENT_SUBMITTED_FOR_REVIEW: 'ContentSubmittedForReview',
  CONTENT_APPROVED: 'ContentApproved',
  CONTENT_REJECTED: 'ContentRejected',

  // Publishing domain
  CONTENT_PUBLISHED: 'ContentPublished',
  CONTENT_SCHEDULED: 'ContentScheduled',

  // Analytics domain
  METRIC_THRESHOLD_BREACH: 'MetricThresholdBreach',
  DASHBOARD_UPDATED: 'DashboardUpdated',

  // Notifications domain
  ALERT_TRIGGERED: 'AlertTriggered',
  NOTIFICATION_SENT: 'NotificationSent',

  // Users domain
  USER_REGISTERED: 'UserRegistered',

  // Monitoring domain
  HEALTH_STATUS: 'HealthStatus',
} as const

export type DomainEvent = (typeof DomainEvents)[keyof typeof DomainEvents]
