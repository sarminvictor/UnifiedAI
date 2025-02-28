import prisma from '@/lib/prismaClient';
import { CreditTransactionData } from './types';

export async function updateSubscriptionInDb(params: {
    subscriptionId: string;
    status: string;
    endDate?: Date;
    stripeInfo?: string;
}) {
    return await prisma.subscription.update({
        where: { subscription_id: params.subscriptionId },
        data: {
            status: params.status,
            end_date: params.endDate,
            stripe_info: params.stripeInfo,
            updated_at: new Date()
        }
    });
}

export async function createNewSubscription(params: {
    userId: string;
    planId: string;
    stripePaymentId: string;
    stripeInfo: string;
    endDate: Date;
}) {
    return await prisma.subscription.create({
        data: {
            user_id: params.userId,
            plan_id: params.planId,
            status: 'Active',
            start_date: new Date(),
            end_date: params.endDate,
            payment_status: 'Paid',
            stripe_payment_id: params.stripePaymentId,
            stripe_info: params.stripeInfo
        }
    });
}

export async function updateUserCredits(params: {
    userId: string;
    credits: string;
}) {
    return await prisma.user.update({
        where: { id: params.userId },
        data: {
            credits_remaining: params.credits,
            updated_at: new Date()
        }
    });
}

export async function createFreeSubscription(userId: string) {
    const freePlan = await prisma.plan.findFirst({
        where: { plan_name: { contains: 'Free', mode: 'insensitive' } }
    });

    if (!freePlan) {
        throw new Error('Free plan not found');
    }

    return await prisma.subscription.create({
        data: {
            user_id: userId,
            plan_id: freePlan.plan_id,
            status: 'Active',
            start_date: new Date(),
            end_date: new Date(2099, 11, 31),
            payment_status: 'Free',
            stripe_payment_id: 'free_tier',
            stripe_info: 'FREE TIER | System Generated',
            created_at: new Date(),
            updated_at: new Date()
        }
    });
}

export async function createCreditTransaction(params: CreditTransactionData) {
    return await prisma.creditTransaction.create({
        data: {
            user_id: params.userId,
            subscription_id: params.subscriptionId,
            credits_deducted: params.creditsDeducted,
            credits_added: params.creditsAdded,
            payment_method: params.paymentMethod || "Stripe",
            description: params.description
        }
    });
}

export async function getCurrentActiveSubscription(userId: string) {
    return await prisma.subscription.findFirst({
        where: {
            user_id: userId,
            status: 'Active'
        },
        include: { plan: true }
    });
}

export async function updateSubscriptionStatusBatch(subscriptionIds: string[], status: string) {
    return await prisma.subscription.updateMany({
        where: {
            subscription_id: { in: subscriptionIds }
        },
        data: {
            status: status,
            updated_at: new Date()
        }
    });
}

export async function findSubscriptionByStripeId(stripeSubscriptionId: string) {
    return await prisma.subscription.findFirst({
        where: { stripe_payment_id: stripeSubscriptionId },
        include: {
            user: true,
            plan: true
        }
    });
}

export async function createCreditAdjustment(params: {
    userId: string;
    subscriptionId: string;
    amount: string;
    reason: string;
}) {
    return await prisma.creditTransaction.create({
        data: {
            user_id: params.userId,
            subscription_id: params.subscriptionId,
            credits_added: params.amount,
            credits_deducted: '0',
            payment_method: 'Adjustment',
            description: params.reason,
            createdAt: new Date()
        }
    });
}

export async function updateSubscriptionPaymentStatus(subscriptionId: string, status: string) {
    return await prisma.subscription.update({
        where: { subscription_id: subscriptionId },
        data: {
            payment_status: status,
            updated_at: new Date()
        }
    });
}

export async function getSubscriptionWithPlan(subscriptionId: string) {
    return await prisma.subscription.findUnique({
        where: { subscription_id: subscriptionId },
        include: {
            plan: true,
            user: true
        }
    });
}

export async function updateUserSubscriptionDetails(params: {
    userId: string;
    credits: string;
    subscriptionId: string;
    status: string;
}) {
    return await prisma.$transaction([
        prisma.user.update({
            where: { id: params.userId },
            data: {
                credits_remaining: params.credits,
                updated_at: new Date()
            }
        }),
        prisma.subscription.update({
            where: { subscription_id: params.subscriptionId },
            data: {
                status: params.status,
                updated_at: new Date()
            }
        })
    ]);
}
