import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { config } from '@/config'
import { rateLimitMiddleware } from '@/middleware/rate-limit'
import { errorHandler, notFoundHandler } from '@/middleware/error-handler'
import { logger } from '@/utils/logger'

const app = express()
const httpServer = createServer(app)

// ── WebSocket server ───────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.CORS_ORIGINS === '*' ? '*' : config.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'WebSocket client connected')

  socket.on('subscribe', (channel: string) => {
    socket.join(channel)
    logger.debug({ socketId: socket.id, channel }, 'Client subscribed to channel')
  })

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'WebSocket client disconnected')
  })
})

// ── Middleware ─────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: config.CORS_ORIGINS === '*' ? '*' : config.CORS_ORIGINS.split(',') }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(rateLimitMiddleware)

// ── Health checks ──────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/v1/ready', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() })
})

// ── Routes ─────────────────────────────────────────────────────────────
// Route registration will be filled in by /ddd-implement

// ── Error handling ─────────────────────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

// ── Start ──────────────────────────────────────────────────────────────
const port = config.PORT

httpServer.listen(port, () => {
  logger.info({ port, env: config.NODE_ENV }, `Nexus API server started`)
})

// ── Graceful shutdown ──────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  httpServer.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  httpServer.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
})

export default app
