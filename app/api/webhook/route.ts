import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

// CRITICAL: Use edge runtime for webhook handling on Vercel
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// This is the critical part - following Stripe's official example exactly
export async function POST(req: NextRequest): Promise<NextResponse> {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    console.log('Webhook received with payload length:', payload.length);
    console.log('Signature header present:', !!signature);

    let event: Stripe.Event;

    try {
        event = await stripe.webhooks.constructEventAsync(
            payload,
            signature,
            webhookSecret
        );

        console.log(`✅ Success: Validated webhook [${event.id}]`);
    } catch (err) {
        console.error(`❌ Error message: ${(err as Error).message}`);
        return NextResponse.json(
            {
                error: {
                    message: `Webhook Error: ${(err as Error).message}`,
                },
            },
            { status: 400 }
        );
    }

    // Handle the event
    console.log(`Processing event: ${event.type} [${event.id}]`);

    // Store event ID for processing in webhook-processor
    try {
        // You can implement a separate endpoint that processes these stored events
        console.log(`Event to be processed: ${event.type}`, {
            id: event.id,
            type: event.type,
            object: event.data.object,
        });

        // For demo purposes, log key event information
        // In production, you would call your processor endpoint here
        if (process.env.NEXT_PUBLIC_APP_URL) {
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhook-processor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                console.error('Failed to send event to processor', { status: response.status });
            }
        }
    } catch (error) {
        // Log but don't fail the webhook
        console.error('Error processing webhook:', error);
    }

    return NextResponse.json({ received: true });
}

// Simple options handler to respond to preflight requests
export async function OPTIONS(req: NextRequest) {
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

export function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}