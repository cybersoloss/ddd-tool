// Script seed: Default system settings
// Source: specs/schemas/setting.yaml (strategy: script)
// Estimated records: ~20 default configuration values
//
// This script should be run once after initial deployment to populate
// default system configuration values. Customize as needed per environment.
//
// Example usage: npx tsx prisma/seeds/settings-seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_SETTINGS = [
  { key: 'ai.model.default', value: 'anthropic/claude-sonnet' },
  { key: 'ai.model.fallback', value: 'openai/gpt-4o' },
  { key: 'content.quality.min_score', value: 0.7 },
  { key: 'content.bias.max_score', value: 0.8 },
  { key: 'ingestion.rss.interval_minutes', value: 15 },
  { key: 'ingestion.web.delay_min_ms', value: 1000 },
  { key: 'ingestion.web.delay_max_ms', value: 3000 },
  { key: 'publishing.retry.max_attempts', value: 3 },
  { key: 'notifications.digest.default_frequency', value: 'daily' },
  { key: 'monitoring.health_check.interval_ms', value: 60000 },
]

async function main() {
  console.log('Seeding default settings...')
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as any },
      create: { key: setting.key, value: setting.value as any },
    })
  }
  console.log(`Seeded ${DEFAULT_SETTINGS.length} settings.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
