import { headers } from 'next/headers';
import Stripe from 'stripe';
import stripeClient from './stripe';

export async function validateStripeWebhook(body: string, signature: string | null) {
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('Missing signature or webhook secret');
    }

    if (!stripeClient) {
        throw new Error('Stripe client not initialized');
    }

    try {
        return stripeClient.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
}
