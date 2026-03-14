// Anthropic Claude integration client
import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/config'
import { createError } from '@/errors'
import { logger } from '@/utils/logger'

export const anthropicClient = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
  timeout: 120_000,
  maxRetries: 2,
})

export interface LlmCallOptions {
  model?: string
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

export const anthropicHelper = {
  call: async (opts: LlmCallOptions): Promise<string> => {
    const model = opts.model ?? 'claude-sonnet-4-6'
    try {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: opts.prompt },
      ]
      const response = await anthropicClient.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
        ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
        messages,
      })
      const content = response.content[0]
      if (content.type !== 'text') throw new Error('Unexpected content type')
      return content.text
    } catch (err: any) {
      logger.error({ err, model }, 'Anthropic API call failed')
      if (err?.status === 429) throw createError('QUOTA_EXCEEDED', 'Anthropic API quota exceeded', { service: 'anthropic' })
      throw createError('AI_PROCESSING_FAILED', 'Anthropic API error', { details: err?.message })
    }
  },

  callStructured: async <T>(opts: LlmCallOptions & { schema?: Record<string, unknown> }): Promise<T> => {
    const raw = await anthropicHelper.call(opts)
    try {
      return JSON.parse(raw) as T
    } catch {
      throw createError('AI_PROCESSING_FAILED', 'Failed to parse structured LLM response')
    }
  },
}
