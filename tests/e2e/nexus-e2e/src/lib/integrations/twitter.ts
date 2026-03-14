// Twitter API v2 integration client
// Docs: https://developer.twitter.com/en/docs/twitter-api
import { config } from '@/config'
import { createError } from '@/errors'
import { logger } from '@/utils/logger'

const BASE_URL = 'https://api.twitter.com/2'
const RATE_LIMIT_WINDOW_MS = 900_000 // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 300

let requestCount = 0
let windowStart = Date.now()

async function twitterFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Simple rate limit tracking
  const now = Date.now()
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCount = 0
    windowStart = now
  }
  if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
    throw createError('QUOTA_EXCEEDED', 'Twitter API rate limit reached', { service: 'twitter' })
  }
  requestCount++

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.TWITTER_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text()
    logger.error({ status: res.status, path, body }, 'Twitter API error')
    if (res.status === 429) throw createError('QUOTA_EXCEEDED', 'Twitter API quota exceeded', { service: 'twitter' })
    if (res.status === 503) throw createError('SERVICE_UNAVAILABLE', 'Twitter API unavailable', { service: 'twitter' })
    throw createError('INTERNAL_ERROR', `Twitter API error: ${res.status}`, body)
  }

  return res.json() as Promise<T>
}

export const twitterClient = {
  searchTweets: (query: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams({ query, max_results: '10', ...params }).toString()
    return twitterFetch<any>(`/tweets/search/recent?${qs}`)
  },

  getTweet: (id: string) =>
    twitterFetch<any>(`/tweets/${id}?tweet.fields=text,author_id,created_at`),

  postTweet: (text: string) =>
    twitterFetch<any>('/tweets', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
}
