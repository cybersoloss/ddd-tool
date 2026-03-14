import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ── Migration seed: Roles ──────────────────────────────────────────────
  console.log('Seeding roles...')
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      permissions: { manage_users: true, manage_content: true, manage_settings: true, review_content: true, publish_content: true },
    },
  })
  await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      permissions: { manage_content: true, review_content: true, publish_content: true },
    },
  })
  await prisma.role.upsert({
    where: { name: 'reviewer' },
    update: {},
    create: {
      name: 'reviewer',
      permissions: { review_content: true },
    },
  })
  await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      permissions: { view_content: true },
    },
  })

  // ── Migration seed: Channels ───────────────────────────────────────────
  console.log('Seeding channels...')
  await prisma.channel.upsert({
    where: { name: 'Website' },
    update: {},
    create: {
      name: 'Website',
      type: 'website',
      config: { cms_url: 'https://cms.example.com/api' },
      enabled: true,
    },
  })
  await prisma.channel.upsert({
    where: { name: 'Newsletter' },
    update: {},
    create: {
      name: 'Newsletter',
      type: 'newsletter',
      config: { sendgrid_list_id: 'default' },
      enabled: true,
    },
  })
  await prisma.channel.upsert({
    where: { name: 'Twitter' },
    update: {},
    create: {
      name: 'Twitter',
      type: 'twitter',
      config: { account: '@nexus' },
      enabled: true,
    },
  })

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
