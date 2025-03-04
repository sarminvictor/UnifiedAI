import { Stripe } from 'stripe';
import prisma from '@/lib/prismaClient';
import { validatePlan } from '@/utils/subscriptions/validator';
import { cancelStripeSubscription } from '@/services/subscriptions/stripeService';
import {
    updateSubscriptionInDb,
    createFreeSubscription,
    getCurrentActiveSubscription  // Add this import
} from '@/services/subscriptions/dbOperations';
import { sendSubscriptionUpdate } from "@/utils/sse";
import { logSubscriptionError, logWebhookEvent } from '@/utils/subscriptions/webhookLogger';
import { SubscriptionCheckoutData } from '@/services/subscriptions/types';
import { Decimal } from '@prisma/client/runtime/library';

export async function handleSubscriptionProcess(data: SubscriptionCheckoutData) {
    const { userId, stripeSubscription, stripeCustomer, productDetails, activeSubscriptionIds } = data;

    try {
        const { plan } = await validatePlan(productDetails.id);

        // Get current active subscription and user's remaining credits
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits_remaining: true }
        });

        // Convert credits_remaining to Decimal for accurate calculations
        const currentCredits = new Decimal(user?.credits_remaining || '0');
        const creditsToDeduct = currentCredits.toString();
        const newCredits = new Decimal(plan.credits_per_month);

        const stripeInfo = [
            stripeSubscription.status.toUpperCase(),
            stripeCustomer.name || stripeCustomer.email,
            productDetails.name
        ].join(' | ');

        // Execute transaction and store result
        const newSubscription = await prisma.$transaction(async (tx) => {
            // Cancel ALL existing subscriptions
            if (activeSubscriptionIds?.length) {
                for (const sub of activeSubscriptionIds) {
                    if (sub.stripeId && sub.stripeId !== 'free_tier') {
                        await cancelStripeSubscription(sub.stripeId);
                    }

                    await tx.subscription.update({
                        where: { subscription_id: sub.id },
                        data: {
                            status: "Canceled",
                            end_date: new Date()
                        }
                    });
                }
            }

            // Create new paid subscription
            const newSub = await tx.subscription.create({
                data: {
                    user_id: userId,
                    plan_id: plan.plan_id,
                    status: 'Active',
                    start_date: new Date(),
                    end_date: new Date(stripeSubscription.current_period_end * 1000),
                    payment_status: 'Paid',
                    stripe_payment_id: stripeSubscription.id,
                    stripe_info: stripeInfo
                }
            });

            // Create credit transaction with actual remaining credits
            await tx.creditTransaction.create({
                data: {
                    user_id: userId,
                    subscription_id: newSub.subscription_id,
                    credits_deducted: creditsToDeduct,
                    credits_added: newCredits.toString(),
                    payment_method: "Stripe",
                    description: `Plan change: remaining credits ${creditsToDeduct} to new plan ${plan.plan_name}`
                }
            });

            // Update user credits with new plan amount
            await tx.user.update({
                where: { id: userId },
                data: {
                    credits_remaining: newCredits.toString()
                }
            });

            return newSub;
        });

        // Send notification to client
        await sendSubscriptionUpdate(userId, {
            type: "subscription_updated",
            details: {
                planName: plan.plan_name,
                creditsRemaining: newCredits.toString(),
                renewalDate: new Date(stripeSubscription.current_period_end * 1000).toISOString()
            }
        });

        // Return the new subscription
        return newSubscription;

    } catch (error) {
        logSubscriptionError(error, { userId, operation: 'handleSubscriptionProcess' });
        throw error;
    }
}

// Only create free subscription during subscription deletion/downgrade
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
        const dbSub = await prisma.subscription.findFirst({
            where: {
                stripe_payment_id: subscription.id,
                status: { in: ['Active', 'Pending Downgrade'] }
            },
            include: { user: true, plan: true }
        });

        if (!dbSub) return;

        await prisma.$transaction(async (tx) => {
            // Cancel current subscription
            await tx.subscription.update({
                where: { subscription_id: dbSub.subscription_id },
                data: {
                    status: 'Canceled',
                    end_date: new Date()
                }
            });

            // Create free subscription only on deletion/downgrade
            await createFreeSubscription(dbSub.user_id);
        });

        // ...rest of existing code...
    } catch (error) {
        // ...existing error handling...
    }
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
        const dbSub = await prisma.subscription.findFirst({
            where: { stripe_payment_id: subscription.id },
            include: { user: true, plan: true }
        });

        if (!dbSub) return;

        const isDowngrade = subscription.cancel_at_period_end;

        await updateSubscriptionInDb({
            subscriptionId: dbSub.subscription_id,
            status: isDowngrade ? 'Pending Downgrade' : 'Active',
            endDate: new Date(subscription.current_period_end * 1000)
        });

        // Remove credit transaction on renewal - it's handled during plan changes only
        return { success: true };
    } catch (error) {
        logWebhookEvent('subscription_update_error', { error, subscription });
        throw error;
    }
}
