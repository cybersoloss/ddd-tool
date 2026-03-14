// Cross-cutting pattern: stealth_http
// Rotates User-Agent, adds randomized delays (1-3s), respects robots.txt
// Used by: ingestion domain (scrape-web-content, fetch-rss-feeds)
import { logger } from '@/utils/logger'

const USER_AGENTS = [
  'Mozilla/5.0 (compatible; Nexus/1.0; +https://nexus.example.com/bot)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
]

const robotsCache = new Map<string, { disallowed: string[]; cachedAt: number }>()
const ROBOTS_CACHE_TTL_MS = 3_600_000 // 1 hour

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function randomDelayMs(minMs = 1000, maxMs = 3000): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchRobotsTxt(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin)
  if (cached && Date.now() - cached.cachedAt < ROBOTS_CACHE_TTL_MS) {
    return cached.disallowed
  }
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) {
      robotsCache.set(origin, { disallowed: [], cachedAt: Date.now() })
      return []
    }
    const text = await res.text()
    const disallowed: string[] = []
    let capture = false
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.slice('user-agent:'.length).trim()
        capture = agent === '*' || agent.toLowerCase().includes('nexus')
      }
      if (capture && trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.slice('disallow:'.length).trim()
        if (path) disallowed.push(path)
      }
    }
    robotsCache.set(origin, { disallowed, cachedAt: Date.now() })
    return disallowed
  } catch {
    return []
  }
}

function isDisallowed(url: string, disallowed: string[]): boolean {
  try {
    const pathname = new URL(url).pathname
    return disallowed.some((rule) => pathname.startsWith(rule))
  } catch {
    return false
  }
}

export async function stealthFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const origin = new URL(url).origin
  const disallowed = await fetchRobotsTxt(origin)
  if (isDisallowed(url, disallowed)) {
    logger.warn({ url }, 'URL disallowed by robots.txt, skipping')
    throw new Error(`URL disallowed by robots.txt: ${url}`)
  }

  const delay = randomDelayMs()
  logger.debug({ url, delay }, 'Stealth HTTP delay')
  await sleep(delay)

  return fetch(url, {
    ...options,
    headers: {
      'User-Agent': randomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...options.headers,
    },
  })
}
