// Cross-cutting pattern: api_key_resolution
// Resolves API key from: X-API-Key header → ?api_key query → env var → error
// Used by: users domain, ingestion domain, processing domain
import { Request } from 'express'
import { createError } from '@/errors'

export function resolveApiKey(req: Request, envFallback?: string): string {
  // 1. Check X-API-Key header
  const headerKey = req.headers['x-api-key']
  if (typeof headerKey === 'string' && headerKey.length > 0) return headerKey

  // 2. Check ?api_key query param
  const queryKey = req.query['api_key']
  if (typeof queryKey === 'string' && queryKey.length > 0) return queryKey

  // 3. Fall back to environment variable
  if (envFallback && process.env[envFallback]) return process.env[envFallback]!

  throw createError('INVALID_API_KEY', 'API key is required')
}
