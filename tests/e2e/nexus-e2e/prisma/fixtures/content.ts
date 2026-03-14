// Fixture: Content items for development/test
export const contentFixtures = [
  {
    title: 'AI Advances in 2026',
    body: 'Content body here...',
    category: 'news' as const,
    status: 'draft' as const,
    sourceType: 'rss',
  },
  {
    title: 'Opinion: Future of ML',
    body: 'Opinion piece body...',
    category: 'opinion' as const,
    status: 'review' as const,
    sourceType: 'web',
  },
  {
    title: 'Research Paper Summary',
    body: 'Research summary body...',
    category: 'research' as const,
    status: 'approved' as const,
    sourceType: 'csv',
  },
]
