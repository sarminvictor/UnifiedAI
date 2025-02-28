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
        const stripeProductId = stripeSubscription.items.data[0].price.product as string;

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
                    stripe_payment_id: stripeSubscription.id
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
    const eventKey = `${subscription.id}-${subscription.current_period_end}`;
    if (processedEvents.has(eventKey)) {
        console.log('🔄 Skipping duplicate event:', eventKey);
        return NextResponse.json({ received: true, skipped: true });
    }

    processedEvents.add(eventKey);
    setTimeout(() => processedEvents.delete(eventKey), DEBOUNCE_TIMEOUT);

    let userId = subscription.metadata?.userId;
    if (!userId) {
        const dbSub = await prisma.subscription.findFirst({
            where: { stripe_payment_id: subscription.id }
        });
        if (!dbSub?.user_id) return NextResponse.json({ received: true });
        userId = dbSub.user_id;
    }

    const endDate = new Date(subscription.current_period_end * 1000);
    const newStatus = subscription.cancel_at_period_end ? 'Pending Downgrade' : 'Active';

    try {
        // Get subscription and plan details
        const dbSubscription = await prisma.subscription.findFirst({
            where: { stripe_payment_id: subscription.id },
            include: { plan: true }
        });

        // Check if this is a restoration of auto-renewal
        if (newStatus === 'Active' && subscription.cancel_at_period_end === false) {
            console.log(`✅ Subscription ${subscription.id} auto-renewal restored`);

            // Update subscription in database - don't change payment_status
            await prisma.$transaction(async (tx) => {
                const updatedSub = await tx.subscription.updateMany({
                    where: {
                        user_id: userId,
                        stripe_payment_id: subscription.id
                    },
                    data: {
                        end_date: endDate,
                        status: newStatus
                        // Removed payment_status update
                    }
                });

                // Log transaction for auto-renewal restoration
                await tx.creditTransaction.create({
                    data: {
                        user_id: userId,
                        subscription_id: subscription.id,
                        credits_added: dbSubscription?.plan.credits_per_month || '0',
                        credits_deducted: '0',
                        payment_method: 'System',
                        description: `Auto-renewal restored: ${dbSubscription ? dbSubscription.plan.plan_name : 'None'}`
                    }
                });
            });

            // Update Stripe metadata
            await stripe.subscriptions.update(subscription.id, {
                metadata: {
                    ...subscription.metadata,
                    autoRenewalRestored: 'true',
                    restoredAt: new Date().toISOString()
                }
            });
        } else if (newStatus === 'Pending Downgrade') {
            console.log(`⚠️ Subscription ${subscription.id} marked for downgrade`);

            await prisma.subscription.updateMany({
                where: { user_id: userId, stripe_payment_id: subscription.id },
                data: { end_date: endDate, status: newStatus }
            });
        } else {
            // Regular subscription update
            await prisma.subscription.updateMany({
                where: { user_id: userId, stripe_payment_id: subscription.id },
                data: { end_date: endDate, status: newStatus }
            });
        }

        return NextResponse.json({
            received: true,
            status: newStatus,
            autoRenewalRestored: newStatus === 'Active' && !subscription.cancel_at_period_end
        });
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
        const newSubscription = await tx.subscription.create({
            data: {
                user_id: userId,
                plan_id: freePlan.plan_id,
                status: 'Active',
                start_date: new Date(),
                end_date: new Date(8640000000000000), // Far future date
                stripe_payment_id: 'free_tier',
                payment_status: 'Free'
            }
        });

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