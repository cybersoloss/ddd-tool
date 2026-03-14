// Fixture: Content ingestion sources for development/test
export const contentSourceFixtures = [
  {
    type: 'rss' as const,
    name: 'TechCrunch RSS',
    url: 'https://techcrunch.com/feed/',
    config: { check_interval_minutes: 15 },
    enabled: true,
  },
  {
    type: 'rss' as const,
    name: 'Hacker News RSS',
    url: 'https://hnrss.org/frontpage',
    config: { check_interval_minutes: 30 },
    enabled: true,
  },
  {
    type: 'webhook' as const,
    name: 'Custom Webhook',
    url: null,
    config: { secret: 'WEBHOOK_SECRET' },
    enabled: true,
  },
]
