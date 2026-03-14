// BullMQ worker registry
// Workers are populated by /ddd-implement for each flow with queue-based triggers
import { Worker, Queue } from 'bullmq'
import { config } from '@/config'
import { logger } from '@/utils/logger'

const connection = { url: config.REDIS_URL }

// Queue definitions — one per domain that uses job queues
export const queues = {
  ingestion: new Queue('ingestion', { connection }),
  processing: new Queue('processing', { connection }),
  publishing: new Queue('publishing', { connection }),
  notifications: new Queue('notifications', { connection }),
}

// Worker registry — populated by /ddd-implement
const workerRegistry: Worker[] = []

function registerWorker(queueName: string, handler: (job: any) => Promise<void>) {
  const worker = new Worker(
    queueName,
    async (job) => {
      logger.info({ queue: queueName, jobId: job.id, name: job.name }, 'Processing job')
      await handler(job)
    },
    {
      connection,
      concurrency: 5,
    }
  )

  worker.on('completed', (job) => {
    logger.info({ queue: queueName, jobId: job.id }, 'Job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ queue: queueName, jobId: job?.id, err }, 'Job failed')
  })

  workerRegistry.push(worker)
  return worker
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers')
  await Promise.all(workerRegistry.map((w) => w.close()))
  process.exit(0)
})

logger.info({ queues: Object.keys(queues) }, 'Workers started')

export { registerWorker }
