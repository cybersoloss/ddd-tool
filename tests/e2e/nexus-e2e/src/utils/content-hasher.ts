// Cross-cutting pattern: content_hashing
// SHA-256 of (source_id + source_type) for deduplication
// Used by: ingestion domain
import { createHash } from 'crypto'

export function hashContentFingerprint(sourceId: string, sourceType: string): string {
  return createHash('sha256')
    .update(`${sourceType}:${sourceId}`)
    .digest('hex')
}

export function hashBody(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}
