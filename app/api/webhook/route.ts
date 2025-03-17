import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import stripeClient from '@/utils/subscriptions/stripe';
import { logWebhookEvent } from '@/utils/subscriptions/webhookLogger';
import { handleCheckoutCompleted, handleSubscriptionUpdated, handleSubscriptionDeleted } from '@/handlers/subscriptions';

// Type for active subscription IDs
type ActiveSubscriptionId = {
    id: string;
    stripeId: string;
};

// Event deduplication tracking
const processedEvents = new Set<string>();
const DEBOUNCE_TIMEOUT = 5000; // 5 seconds

// Initialize Stripe directly if the imported client is null
const stripe = stripeClient || new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing Stripe webhook secret');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const sig = headers().get('stripe-signature') || '';

        if (!sig) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 });
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        const event = stripe.webhooks.constructEvent(
            body,
            sig,
            webhookSecret
        );

        const eventId = `${event.type}-${event.id}`;

        if (processedEvents.has(eventId)) {
            console.log('🔄 Skipping duplicate event:', eventId);
            return NextResponse.json({ received: true, skipped: true });
        }

        processedEvents.add(eventId);
        setTimeout(() => processedEvents.delete(eventId), DEBOUNCE_TIMEOUT);

        console.log('Processing webhook event:', event.type, eventId);

        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;
            case 'invoice.created':
            case 'invoice.finalized':
            case 'invoice.updated':
            case 'invoice.paid':
            case 'invoice.payment_succeeded':
                // These events are expected and can be safely ignored
                console.log(`📋 Processing invoice event: ${event.type}`);
                break;
            default:
                console.log(`⚠️ Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true, eventId, type: event.type });
    } catch (err) {
        console.error('❌ Webhook error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 400 }
        );
    }
}

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export const GET = async () => {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};