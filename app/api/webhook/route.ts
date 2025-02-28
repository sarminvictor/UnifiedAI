import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prismaClient';
import stripeClient from '@/utils/subscriptions/stripe';
import { logWebhookEvent, logTransactionDetails } from '@/utils/subscriptions/webhookLogger';
import { sendSubscriptionUpdate } from "@/utils/sse";
import { PLAN_TO_STRIPE_PRODUCT } from '@/utils/subscriptions/stripe';

// Ensure Stripe is initialized
if (!stripeClient) {
    throw new Error('Stripe client is not initialized');
}

const stripe = stripeClient;

// Type for active subscription IDs
type ActiveSubscriptionId = {
    id: string;
    stripeId: string;
};

// Event deduplication tracking
const processedEvents = new Set<string>();
const DEBOUNCE_TIMEOUT = 5000; // 5 seconds

if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const sig = headers().get('stripe-signature');

        if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Invalid signature or webhook secret' }, { status: 400 });
        }

        const event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        const eventId = `${event.type}-${event.id}`; // Unique event identifier

        // Check if event was already processed
        if (processedEvents.has(eventId)) {
            console.log('🔄 Skipping duplicate event:', eventId);
            return NextResponse.json({ received: true, skipped: true });
        }

        // Add event to processed set & schedule removal
        processedEvents.add(eventId);
        setTimeout(() => processedEvents.delete(eventId), DEBOUNCE_TIMEOUT);

        console.log('Processing webhook event:', event.type, eventId);

        // Handle the event
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
            default:
                console.log(`⚠️ Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({
            received: true,
            eventId,
            type: event.type
        });
    } catch (err) {
        console.error('❌ Webhook error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 400 }
        );
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    logWebhookEvent('checkout.session.completed', session);

    if (!session.subscription) {
        console.error('❌ Missing Stripe subscription ID:', session.id);
        return;
    }

    try {
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const stripeCustomer = await stripe.customers.retrieve(stripeSubscription.customer as string);
        if ('deleted' in stripeCustomer) {
            throw new Error('Customer has been deleted');
        }
        const stripeProductId = stripeSubscription.items.data[0].price.product as string;

        // Get Stripe product details
        const stripeProduct = await stripe.products.retrieve(
            stripeSubscription.items.data[0].price.product as string
        );

        // Use raw Stripe status
        const stripeInfo = [
            stripeSubscription.status.toUpperCase(),  // Raw Stripe status (e.g., "active", "trialing")
            stripeCustomer.name || stripeCustomer.email,
            stripeProduct.name
        ].join(' | ');

        // Type-safe plan name lookup
        const planName = Object.entries(PLAN_TO_STRIPE_PRODUCT).find(
            ([_, productId]) => productId === stripeProductId
        )?.[0];

        if (!planName) {
            console.error(`❌ Unrecognized product ID from Stripe: ${stripeProductId}`);
            return;
        }

        // Get plan from database using plan name
        const plan = await prisma.plan.findFirst({
            where: { plan_name: planName }
        });

        if (!plan) {
            console.error(`❌ Plan not found in database: ${planName}`);
            return;
        }

        const userId = session.client_reference_id;
        const activeSubscriptionIds = JSON.parse(session.metadata?.activeSubscriptionIds || '[]');

        if (!userId) {
            console.error('❌ Missing required metadata:', { userId, sessionId: session.id });
            return;
        }

        await prisma.$transaction(async (tx) => {
            // ✅ Fetch current active subscription
            const currentActiveSub = await tx.subscription.findFirst({
                where: { user_id: userId, status: 'Active' },
                include: { plan: true }
            });

            const creditsToDeduct = currentActiveSub?.plan.credits_per_month || '0';

            // ✅ Cancel old subscriptions AFTER successful new subscription creation
            for (const sub of activeSubscriptionIds as ActiveSubscriptionId[]) {
                if (sub.stripeId && sub.stripeId !== 'free_tier') {
                    try {
                        await stripe.subscriptions.cancel(sub.stripeId);
                        console.log(`✅ Cancelled old Stripe subscription: ${sub.stripeId}`);
                    } catch (error) {
                        console.error(`❌ Failed to cancel Stripe subscription: ${sub.stripeId}`, error);
                    }
                }
            }

            // ✅ Update old subscriptions in DB - preserve payment_status
            await tx.subscription.updateMany({
                where: {
                    subscription_id: {
                        in: activeSubscriptionIds.map((sub: { id: any; }) => sub.id)
                    }
                },
                data: {
                    status: "Canceled",
                    end_date: new Date()
                    // Removed payment_status update to preserve original status
                }
            });

            // ✅ Create new subscription
            const newSubscription = await tx.subscription.create({
                data: {
                    user_id: userId,
                    plan_id: plan.plan_id,
                    status: 'Active',
                    start_date: new Date(),
                    end_date: new Date(stripeSubscription.current_period_end * 1000),
                    payment_status: 'Paid',
                    stripe_payment_id: stripeSubscription.id,
                    stripe_info: stripeInfo,
                }
            });

            console.log('✅ Created new subscription:', newSubscription.subscription_id);

            // ✅ Deduct credits from the previous subscription
            if (creditsToDeduct !== '0') {
                await tx.creditTransaction.create({
                    data: {
                        user_id: userId,
                        subscription_id: newSubscription.subscription_id,
                        credits_deducted: creditsToDeduct,
                        credits_added: plan.credits_per_month,
                        payment_method: "Stripe",
                        description: `Plan change: ${currentActiveSub ? currentActiveSub.plan.plan_name : 'None'} to ${plan.plan_name}`
                    }
                });
            }

            // ✅ Assign new credits from the selected plan
            await tx.user.update({
                where: { id: userId },
                data: {
                    credits_remaining: plan.credits_per_month,
                    updated_at: new Date()
                }
            });

            console.log('✅ Updated user credits:', plan.credits_per_month);
        });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        logWebhookEvent('webhook_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            session_id: session.id,
            subscription_id: session.subscription
        });
        throw error;
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // ...existing deduplication code...

    try {
        const userId = subscription.metadata?.userId;
        if (!userId) {
            const dbSub = await prisma.subscription.findFirst({
                where: { stripe_payment_id: subscription.id }
            });
            if (!dbSub?.user_id) {
                console.error("❌ User ID not found for subscription:", subscription.id);
                return;
            }
        }

        // 1. Fetch and validate fresh subscription data
        const freshStripeData = await stripe.subscriptions.retrieve(subscription.id);
        console.log("🔍 Stripe Subscription Data:", JSON.stringify(freshStripeData, null, 2));

        if (!freshStripeData || !freshStripeData.status) {
            console.error("❌ Missing Stripe subscription status.");
            return;
        }

        // 2. Validate subscription items
        if (!freshStripeData.items?.data.length) {
            console.error("❌ Subscription has no valid items.");
            return;
        }

        // 3. Fetch and validate customer data
        const stripeCustomer = await stripe.customers.retrieve(freshStripeData.customer as string);
        console.log("🔍 Stripe Customer Data:", JSON.stringify(stripeCustomer, null, 2));

        if ('deleted' in stripeCustomer) {
            throw new Error('❌ Customer has been deleted.');
        }

        const customerNameOrEmail = stripeCustomer.name || stripeCustomer.email || "Unknown Customer";

        // 4. Fetch and validate product data
        const stripeProductId = freshStripeData.items.data[0]?.price?.product as string;
        if (!stripeProductId) {
            console.error("❌ Stripe Product ID not found in subscription items.");
            return;
        }

        const productDetails = await stripe.products.retrieve(stripeProductId);
        console.log("🔍 Stripe Product Data:", JSON.stringify(productDetails, null, 2));

        const productName = productDetails.name || "Unknown Product";

        // 5. Store raw data
        const stripeInfo = [
            freshStripeData.status.toUpperCase(),  // Raw Stripe status
            customerNameOrEmail,                   // Customer info
            productName                           // Product name
        ].join(" | ");

        console.log("✅ Saving Stripe Info:", stripeInfo);

        // Update DB with validated data
        await prisma.subscription.updateMany({
            where: { user_id: userId, stripe_payment_id: subscription.id },
            data: {
                end_date: new Date(freshStripeData.current_period_end * 1000),
                status: freshStripeData.cancel_at_period_end ? 'Pending Downgrade' : 'Active', // Our DB status
                stripe_info: stripeInfo  // Raw Stripe status and details
            }
        });

        // ...rest of existing code...
    } catch (error) {
        console.error('❌ Subscription update error:', error);
        return NextResponse.json({
            received: true,
            warning: 'Processed with errors'
        });
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) {
        const dbSub = await prisma.subscription.findFirst({
            where: { stripe_payment_id: subscription.id }
        });
        if (!dbSub?.user_id) return;
    }

    try {
        // Check for pending downgrade
        const pendingSub = await prisma.subscription.findFirst({
            where: {
                stripe_payment_id: subscription.id,
                status: 'Pending Downgrade'
            },
            include: {
                user: true,
                plan: true
            }
        });

        if (pendingSub) {
            console.log('⬇️ Processing scheduled downgrade to Free plan');
            await createFreeSubscription(pendingSub.user_id);

            // Notify client about the change
            await sendSubscriptionUpdate(pendingSub.user_id, {
                type: "subscription_updated",
                details: {
                    planName: "Free",
                    isDowngradePending: false,
                    creditsRemaining: "0",
                    renewalDate: new Date().toISOString()
                }
            });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ Error handling subscription deletion:', error);
        return NextResponse.json({ received: true, error: 'Failed to process deletion' });
    }
}

// Helper function to create free subscription
async function createFreeSubscription(userId: string) {
    await prisma.$transaction(async (tx) => {
        const freePlan = await tx.plan.findFirst({
            where: {
                plan_name: { contains: 'Free', mode: 'insensitive' }
            }
        });

        if (!freePlan) throw new Error('Free plan not found');

        // Create new Free subscription

        // Update user credits
        await tx.user.update({
            where: { id: userId },
            data: {
                credits_remaining: freePlan.credits_per_month
            }
        });

        console.log('✅ Successfully created Free subscription');
    });
}

export const config = {
    api: {
        bodyParser: false
    }
};

export const GET = async () => {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    );
};