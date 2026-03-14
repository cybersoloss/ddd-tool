import { beforeAll, afterAll } from 'vitest'

// Set test environment variables before config loads
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nexus_test'
process.env.REDIS_URL = 'redis://localhost:6379/1'
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.TWITTER_BEARER_TOKEN = 'test-twitter-bearer'
process.env.TWITTER_API_KEY = 'test-twitter-api-key'
process.env.TWITTER_API_SECRET = 'test-twitter-api-secret'
process.env.TWITTER_ACCESS_TOKEN = 'test-twitter-access-token'
process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test-twitter-access-secret'
process.env.SENDGRID_API_KEY = 'test-sendgrid-key'
process.env.GOOGLE_CSE_API_KEY = 'test-google-cse-key'
process.env.GOOGLE_CSE_ID = 'test-google-cse-id'
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
process.env.NODE_ENV = 'development'
process.env.LOG_LEVEL = 'error' // suppress logs in tests

beforeAll(() => {
  // Global test setup
})

afterAll(() => {
  // Global test teardown
})
