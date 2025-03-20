import { NextRequest } from 'next/server';
import Stripe from 'stripe';

export async function getRawBody(req: NextRequest): Promise<string> {
    const bodyText = await req.text();
    return bodyText;
}

export async function validateStripeWebhook(
    req: NextRequest,
    stripeInstance: Stripe,
    webhookSecret: string
): Promise<Stripe.Event | null> {
    try {
        // Get the raw body text
        const rawBody = await getRawBody(req);

        // Get signature from header
        const signature = req.headers.get('stripe-signature');

        if (!signature) {
            console.error('No Stripe signature found in request headers');
            return null;
        }

        // Construct and verify the event
        const event = stripeInstance.webhooks.constructEvent(
            rawBody,
            signature,
            webhookSecret
        );

        return event;
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return null;
    }
} 