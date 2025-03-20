import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';
import { APIError } from '@/lib/api-helpers';

// This is a standard serverless function - it can use Node.js runtime and database operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
    try {
        // Validate internal API request
        // In production you would use a more secure authentication method
        const authHeader = req.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ') ||
            authHeader.split(' ')[1] !== (process.env.INTERNAL_API_KEY || 'test-key')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse the event data from the request
        const requestBody = await req.json();
        const { event_id, event_type, event_data, created } = requestBody;

        if (!event_id || !event_type || !event_data) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        console.log(`Processing webhook event: ${event_type}`, { id: event_id });

        // Process the event based on its type
        switch (event_type) {
            case 'checkout.session.completed': {
                await handleCheckoutSessionCompleted(event_data);
                break;
            }
            case 'invoice.payment_succeeded': {
                await handleInvoicePaymentSucceeded(event_data);
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                await handleSubscriptionUpdated(event_data);
                break;
            }
            default:
                console.log(`Ignoring unhandled event type: ${event_type}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing webhook event:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Handler for checkout.session.completed events
async function handleCheckoutSessionCompleted(sessionData: any) {
    try {
        const session = sessionData as Stripe.Checkout.Session;
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

        console.log('Checkout session completed successfully', { userId, subscriptionId });
    } catch (error) {
        console.error('Error processing checkout session:', error);
        throw error;
    }
}

// Handler for invoice.payment_succeeded events
async function handleInvoicePaymentSucceeded(invoiceData: any) {
    try {
        const invoice = invoiceData as Stripe.Invoice;
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
                return;
            }

            // Get user by email
            const userEmail = customer.email;
            if (!userEmail) {
                console.error('No email associated with this customer', { customerId });
                return;
            }

            // Find the user
            const user = await prisma.user.findUnique({
                where: { email: userEmail }
            });

            if (!user) {
                console.error('User not found for email', { email: userEmail });
                return;
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
    } catch (error) {
        console.error('Error processing invoice payment:', error);
        throw error;
    }
}

// Handler for subscription update/delete events
async function handleSubscriptionUpdated(subscriptionData: any) {
    try {
        const subscription = subscriptionData as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
            console.error('No user ID found in subscription metadata', {
                subscriptionId: subscription.id
            });

            // If no userId in metadata, try to find user by customer
            if (subscription.customer) {
                const customerId = typeof subscription.customer === 'string'
                    ? subscription.customer
                    : subscription.customer.id;

                const existingSubscription = await prisma.subscription.findFirst({
                    where: {
                        subscription_id: subscription.id
                    },
                    include: {
                        user: true
                    }
                });

                if (existingSubscription?.user) {
                    await updateSubscriptionStatus(
                        subscription.id,
                        subscription.status,
                        subscription.current_period_end
                    );
                    return;
                }
            }

            throw new APIError(400, 'No user ID found in subscription and could not determine user');
        }

        await updateSubscriptionStatus(
            subscription.id,
            subscription.status,
            subscription.current_period_end
        );

        console.log('Subscription status updated', {
            subscriptionId: subscription.id,
            status: subscription.status
        });
    } catch (error) {
        console.error('Error processing subscription update:', error);
        throw error;
    }
}

// Helper function to update subscription status
async function updateSubscriptionStatus(
    subscriptionId: string,
    status: string,
    periodEnd: number
) {
    await prisma.subscription.update({
        where: { subscription_id: subscriptionId },
        data: {
            status: status,
            payment_status: status === 'active' ? 'paid' : 'cancelled',
            end_date: new Date(periodEnd * 1000),
        },
    });
} 