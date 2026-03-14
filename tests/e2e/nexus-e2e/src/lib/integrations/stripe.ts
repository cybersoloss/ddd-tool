// Stripe billing integration client
import Stripe from 'stripe'
import { config } from '@/config'
import { createError } from '@/errors'
import { logger } from '@/utils/logger'

export const stripeClient = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  timeout: 30_000,
  maxNetworkRetries: 2,
})

export const stripeHelper = {
  createCustomer: async (email: string, name?: string) => {
    try {
      return await stripeClient.customers.create({ email, name })
    } catch (err: any) {
      logger.error({ err, email }, 'Stripe createCustomer failed')
      throw createError('SERVICE_UNAVAILABLE', 'Billing service unavailable', { service: 'stripe' })
    }
  },

  createSubscription: async (customerId: string, priceId: string) => {
    try {
      return await stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      })
    } catch (err: any) {
      logger.error({ err, customerId }, 'Stripe createSubscription failed')
      throw createError('SERVICE_UNAVAILABLE', 'Billing service unavailable', { service: 'stripe' })
    }
  },

  constructEvent: (payload: string | Buffer, sig: string, secret: string) => {
    try {
      return stripeClient.webhooks.constructEvent(payload, sig, secret)
    } catch {
      throw createError('WEBHOOK_SIGNATURE_INVALID', 'Invalid Stripe webhook signature')
    }
  },
}
