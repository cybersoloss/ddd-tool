// Google Custom Search Engine integration client
import { config } from '@/config'
import { createError } from '@/errors'
import { logger } from '@/utils/logger'

const BASE_URL = 'https://www.googleapis.com/customsearch/v1'

export interface SearchResult {
  title: string
  link: string
  snippet: string
  pagemap?: Record<string, unknown>
}

export const googleCseClient = {
  search: async (query: string, params?: { num?: number; start?: number }): Promise<SearchResult[]> => {
    const qs = new URLSearchParams({
      key: config.GOOGLE_CSE_API_KEY,
      cx: config.GOOGLE_CSE_ID,
      q: query,
      num: String(params?.num ?? 10),
      ...(params?.start ? { start: String(params.start) } : {}),
    }).toString()

    const res = await fetch(`${BASE_URL}?${qs}`, {
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const body = await res.text()
      logger.error({ status: res.status, query, body }, 'Google CSE error')
      if (res.status === 429) throw createError('QUOTA_EXCEEDED', 'Google CSE quota exceeded', { service: 'google_cse' })
      throw createError('SERVICE_UNAVAILABLE', 'Google CSE unavailable', { service: 'google_cse' })
    }

    const data = await res.json() as any
    return (data.items ?? []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      pagemap: item.pagemap,
    }))
  },
}
