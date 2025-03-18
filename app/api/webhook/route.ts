import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';
import { APIError, errorResponse } from '@/lib/api-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

// New route segment config for Next.js 14
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = headers().get('stripe-signature');

        if (!signature) {
            throw new APIError(400, 'No signature found');
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
                const subscriptionId = session.subscription as string;

                if (!userId) {
                    throw new APIError(400, 'No user ID found in session');
                }

                // Create subscription record
                await prisma.subscription.create({
                    data: {
                        subscription_id: subscriptionId,
                        user_id: userId,
                        plan_id: session.metadata?.planId || 'default-plan',
                        start_date: new Date(),
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                        status: 'active',
                        payment_status: 'paid',
                        stripe_info: `active | ${session.customer} | ${session.metadata?.productId}`,
                        stripe_payment_id: session.payment_intent as string,
                    },
                });

                // Update user's credits
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        credits_remaining: '1000',
                    },
                });

                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata?.userId;

                if (!userId) {
                    throw new APIError(400, 'No user ID found in subscription');
                }

                // Update subscription status
                await prisma.subscription.update({
                    where: { subscription_id: subscription.id },
                    data: {
                        status: subscription.status,
                        payment_status: subscription.status === 'active' ? 'paid' : 'cancelled',
                        end_date: new Date(subscription.current_period_end * 1000),
                    },
                });

                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return errorResponse(error);
    }
}

export const config = {
    api: { bodyParser: false }
};

export const GET = async () => {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};