import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';
import { APIError } from '@/lib/api-helpers';
import { validateStripeWebhook } from '@/utils/stripe-webhook';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

// Next.js 14 route segment config - important for webhooks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    console.log('Webhook request received', {
        url: req.url,
        contentType: req.headers.get('content-type'),
        hasSignature: !!req.headers.get('stripe-signature')
    });

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET is not configured');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    try {
        // Use our utility to validate the webhook with raw body handling
        const event = await validateStripeWebhook(
            req,
            stripe,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        if (!event) {
            return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
        }

        console.log(`Processing webhook event: ${event.type}`, { id: event.id });

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

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('Processing invoice.payment_succeeded', {
                    invoiceId: invoice.id,
                    customerId: invoice.customer,
                    subscriptionId: invoice.subscription,
                });

                // Check if this is for a subscription
                if (invoice.subscription) {
                    // Get subscription details from Stripe
                    const subscriptionId = invoice.subscription as string;
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    // Get customer information
                    const customerId = invoice.customer as string;
                    const customer = await stripe.customers.retrieve(customerId);

                    if ('deleted' in customer && customer.deleted) {
                        console.error('Customer has been deleted', { customerId });
                        break;
                    }

                    // Get user by email
                    const userEmail = customer.email;
                    if (!userEmail) {
                        console.error('No email associated with this customer', { customerId });
                        break;
                    }

                    // Find the user
                    const user = await prisma.user.findUnique({
                        where: { email: userEmail }
                    });

                    if (!user) {
                        console.error('User not found for email', { email: userEmail });
                        break;
                    }

                    console.log('Found user for subscription', {
                        userId: user.id,
                        email: userEmail,
                        subscriptionId
                    });

                    // Get plan details
                    const planId = subscription.items.data[0]?.plan.id || 'unknown-plan';
                    const planProduct = subscription.items.data[0]?.plan.product as string;
                    let planName = 'Unknown Plan';

                    try {
                        const product = await stripe.products.retrieve(planProduct);
                        planName = product.name;
                    } catch (error) {
                        console.error('Error retrieving product', { productId: planProduct });
                    }

                    // Check if subscription already exists in database
                    const existingSubscription = await prisma.subscription.findFirst({
                        where: { subscription_id: subscriptionId }
                    });

                    if (existingSubscription) {
                        // Update existing subscription
                        await prisma.subscription.update({
                            where: { subscription_id: subscriptionId },
                            data: {
                                status: subscription.status,
                                payment_status: 'paid',
                                end_date: new Date(subscription.current_period_end * 1000),
                                stripe_info: `active | ${customerId} | ${planProduct}`,
                            }
                        });

                        console.log('Updated existing subscription', { subscriptionId });
                    } else {
                        // Create new subscription
                        await prisma.subscription.create({
                            data: {
                                subscription_id: subscriptionId,
                                user_id: user.id,
                                plan_id: planId,
                                start_date: new Date(subscription.current_period_start * 1000),
                                end_date: new Date(subscription.current_period_end * 1000),
                                status: subscription.status,
                                payment_status: 'paid',
                                stripe_info: `active | ${customerId} | ${planProduct}`,
                                stripe_payment_id: invoice.payment_intent as string || '',
                            }
                        });

                        console.log('Created new subscription', {
                            userId: user.id,
                            subscriptionId,
                            planName
                        });

                        // Update user's credits based on plan
                        let creditsToAdd = '1000'; // Default credits

                        if (planName.includes('Starter')) {
                            creditsToAdd = '1000';
                        } else if (planName.includes('Pro')) {
                            creditsToAdd = '5000';
                        } else if (planName.includes('Business')) {
                            creditsToAdd = '15000';
                        }

                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                credits_remaining: creditsToAdd,
                            }
                        });

                        console.log('Updated user credits', {
                            userId: user.id,
                            credits: creditsToAdd
                        });
                    }
                }
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

        console.log('Webhook processed successfully', { type: event.type, id: event.id });
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
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