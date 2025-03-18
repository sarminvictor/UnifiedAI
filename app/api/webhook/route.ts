import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';

// Define APIError class since we don't have the appropriate import
class APIError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any, // Cast to any to avoid TypeScript errors
});

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = headers().get('stripe-signature');

        if (!signature) {
            throw new APIError('No signature found', 400);
        }

        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                const planId = session.metadata?.planId;

                if (!userId || !planId) {
                    throw new APIError('Missing metadata', 400);
                }

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        planId,
                        subscriptionStatus: 'active',
                        stripeCustomerId: session.customer as string,
                    },
                });
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata?.userId;

                if (!userId) {
                    throw new APIError('Missing metadata', 400);
                }

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: subscription.status,
                        planId: subscription.items.data[0]?.price.product as string,
                    },
                });
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        if (error instanceof APIError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 