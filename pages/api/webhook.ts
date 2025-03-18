import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';
import { APIError, errorResponse } from '@/lib/api-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const signature = req.headers['stripe-signature'];

        if (!signature) {
            throw new APIError(400, 'No signature found');
        }

        const event = stripe.webhooks.constructEvent(
            req.body,
            signature as string,
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

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return errorResponse(error, res);
    }
} 