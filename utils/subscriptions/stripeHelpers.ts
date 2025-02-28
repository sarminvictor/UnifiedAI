import type { Stripe } from 'stripe';
import stripe from './subscriptions/stripe';
import prisma from '@/lib/prismaClient';

export async function verifyAndUpdateSubscription(sessionId: string) {
    try {
        // Add logging
        console.log('Starting subscription verification for session:', sessionId);

        if (!stripe) {
            throw new Error('Stripe client not initialized');
        }

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription']
        });

        console.log('Retrieved Stripe session:', {
            payment_status: session.payment_status,
            subscription_status: session.subscription ? 'exists' : 'none'
        });

        if (!session || session.payment_status !== 'paid') {
            throw new Error('Payment not completed');
        }

        const userId = session.client_reference_id;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
            throw new Error('Missing user or plan information');
        }

        // Update the subscription in the database
        await prisma.$transaction(async (tx) => {
            console.log('Looking for pending subscription...');

            // Find the pending subscription
            const pendingSubscription = await tx.subscription.findFirst({
                where: {
                    user_id: userId,
                    plan_id: planId,
                    status: 'Pending',
                    stripe_payment_id: sessionId
                },
                include: {
                    plan: true
                }
            });

            if (!pendingSubscription) {
                throw new Error('Pending subscription not found');
            }

            console.log('Found pending subscription:', pendingSubscription.subscription_id);

            // Cancel any existing active subscription
            const currentActive = await tx.subscription.findFirst({
                where: {
                    user_id: userId,
                    status: 'Active'
                },
                include: {
                    plan: true
                }
            });

            if (currentActive) {
                console.log('Canceling current active subscription:', currentActive.subscription_id);
                await tx.subscription.update({
                    where: { subscription_id: currentActive.subscription_id },
                    data: {
                        status: 'Canceled',
                        end_date: new Date()
                    }
                });
            }

            // Get the subscription end date from Stripe
            const stripeSubscription = session.subscription as Stripe.Subscription;
            const endDate = new Date(stripeSubscription.current_period_end * 1000);

            console.log('Updating subscription with Stripe data...');

            // Update the pending subscription
            const updatedSubscription = await tx.subscription.update({
                where: { subscription_id: pendingSubscription.subscription_id },
                data: {
                    status: 'Active',
                    payment_status: 'Paid',
                    stripe_payment_id: stripeSubscription.id,
                    end_date: endDate
                }
            });

            console.log('Updated subscription:', updatedSubscription.subscription_id);

            // Update user's credits
            const user = await tx.user.findUnique({
                where: { id: userId }
            });

            if (user) {
                const creditsDeducted = user.credits_remaining;

                // Create credit transaction record
                await tx.creditTransaction.create({
                    data: {
                        user_id: userId,
                        subscription_id: updatedSubscription.subscription_id,
                        credits_added: pendingSubscription.plan.credits_per_month,
                        credits_deducted: creditsDeducted,
                        payment_method: 'Stripe',
                        description: `Plan change: ${currentActive ? currentActive.plan.plan_name : 'None'} to ${pendingSubscription.plan.plan_name}`
                    }
                });

                // Update user's credits
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        credits_remaining: pendingSubscription.plan.credits_per_month
                    }
                });

                console.log('Updated user credits');
            }
        });

        console.log('Successfully completed subscription verification');
        return true;
    } catch (error) {
        console.error('Error verifying subscription:', error);
        throw error;
    }
}
