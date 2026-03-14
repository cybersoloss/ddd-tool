// OpenAI integration client (secondary AI provider)
import OpenAI from 'openai'
import { config } from '@/config'
import { createError } from '@/errors'
import { logger } from '@/utils/logger'

export const openaiClient = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: 120_000,
  maxRetries: 2,
})

export interface EmbeddingOptions {
  input: string | string[]
  model?: string
}

export const openaiHelper = {
  chat: async (prompt: string, opts?: { model?: string; maxTokens?: number }): Promise<string> => {
    const model = opts?.model ?? 'gpt-4o'
    try {
      const response = await openaiClient.chat.completions.create({
        model,
        max_tokens: opts?.maxTokens ?? 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      return response.choices[0]?.message?.content ?? ''
    } catch (err: any) {
      logger.error({ err, model }, 'OpenAI API call failed')
      if (err?.status === 429) throw createError('QUOTA_EXCEEDED', 'OpenAI quota exceeded', { service: 'openai' })
      throw createError('AI_PROCESSING_FAILED', 'OpenAI API error', { details: err?.message })
    }
  },

  embed: async (opts: EmbeddingOptions): Promise<number[][]> => {
    const model = opts.model ?? 'text-embedding-3-small'
    try {
      const response = await openaiClient.embeddings.create({
        model,
        input: opts.input,
      })
      return response.data.map((d) => d.embedding)
    } catch (err: any) {
      logger.error({ err }, 'OpenAI embeddings failed')
      throw createError('AI_PROCESSING_FAILED', 'OpenAI embeddings error', { details: err?.message })
    }
  },
}
