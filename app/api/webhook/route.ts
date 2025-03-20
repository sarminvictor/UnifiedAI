import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';
import { APIError } from '@/lib/api-helpers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

// CRITICAL: Use edge runtime for webhook handling on Vercel
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('Webhook request received (edge runtime)');

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET is not configured');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    try {
        // Get signature from header
        const signature = req.headers.get('stripe-signature');

        if (!signature) {
            console.error('No Stripe signature found');
            return NextResponse.json({ error: 'No signature found' }, { status: 400 });
        }

        // CRITICAL: Clone the request to get the raw body
        const rawBody = await req.clone().text();

        console.log('Webhook raw body retrieved', {
            length: rawBody.length,
            signature: signature.substring(0, 20) + '...',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'present' : 'missing'
        });

        // Construct the event directly
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err: any) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return NextResponse.json(
                { error: `Webhook signature verification failed: ${err.message}` },
                { status: 400 }
            );
        }

        console.log(`✅ Webhook verified and received: ${event.type}`, { id: event.id });

        // For edge runtime, we need to handle events asynchronously
        // Store the event for processing in a queue or database
        await storeWebhookEvent(event);

        // Return a 200 response immediately to acknowledge receipt
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// For edge runtime, we can't do database operations directly
// Instead, store the event for later processing
async function storeWebhookEvent(event: Stripe.Event) {
    // In production, you would store this in a queue or database for processing
    // For now, log it and we'll implement a separate processor endpoint
    console.log('Storing webhook event for processing:', {
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString()
    });

    // You can implement a separate endpoint that processes these stored events
    // Or use a queue service like AWS SQS, Google Cloud Pub/Sub, etc.

    // For demonstration, make an API call to a processor endpoint
    try {
        // This would be your internal API that processes the stored event
        // For Vercel, this is often another serverless function
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhook-processor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Use an internal API key for security
                'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'test-key'}`
            },
            body: JSON.stringify({
                event_id: event.id,
                event_type: event.type,
                event_data: event.data.object,
                created: event.created
            })
        });

        if (!response.ok) {
            console.error('Failed to queue webhook event for processing', {
                status: response.status,
                statusText: response.statusText
            });
        }
    } catch (error) {
        // Don't fail the webhook if processing fails - we've already acknowledged receipt
        console.error('Error queueing webhook for processing:', error);
    }
}

// Simple options handler to respond to preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export const GET = async () => {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};