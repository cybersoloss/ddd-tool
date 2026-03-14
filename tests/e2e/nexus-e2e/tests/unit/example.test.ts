import { describe, it, expect } from 'vitest'
import { hashContentFingerprint } from '@/utils/content-hasher'
import { isValidContentTransition } from '@/types/shared'
import { AppError, createError } from '@/errors'

describe('content-hasher', () => {
  it('produces deterministic hash for same inputs', () => {
    const hash1 = hashContentFingerprint('article-123', 'rss')
    const hash2 = hashContentFingerprint('article-123', 'rss')
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 hex
  })

  it('produces different hashes for different inputs', () => {
    const hash1 = hashContentFingerprint('article-123', 'rss')
    const hash2 = hashContentFingerprint('article-123', 'web')
    expect(hash1).not.toBe(hash2)
  })
})

describe('content status transitions', () => {
  it('allows valid transitions', () => {
    expect(isValidContentTransition('draft', 'review')).toBe(true)
    expect(isValidContentTransition('review', 'approved')).toBe(true)
    expect(isValidContentTransition('review', 'rejected')).toBe(true)
    expect(isValidContentTransition('approved', 'published')).toBe(true)
    expect(isValidContentTransition('published', 'archived')).toBe(true)
    expect(isValidContentTransition('rejected', 'draft')).toBe(true)
  })

  it('blocks invalid transitions', () => {
    expect(isValidContentTransition('draft', 'published')).toBe(false)
    expect(isValidContentTransition('archived', 'draft')).toBe(false)
    expect(isValidContentTransition('published', 'draft')).toBe(false)
  })
})

describe('error factory', () => {
  it('creates AppError with correct http status', () => {
    const err = createError('NOT_FOUND', 'Test item not found')
    expect(err).toBeInstanceOf(AppError)
    expect(err.httpStatus).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })

  it('serializes to JSON correctly', () => {
    const err = createError('VALIDATION_ERROR', 'Bad input', { field: 'email' })
    const json = err.toJSON()
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.details).toEqual({ field: 'email' })
  })
})
