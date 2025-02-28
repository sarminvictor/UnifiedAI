import { handleSubscriptionError } from '@/utils/errorHandler';
import { SubscriptionErrorCode } from '@/services/subscriptions/types';
import { Stripe } from 'stripe';
import { PLAN_TO_STRIPE_PRODUCT } from './stripe';
import prisma from '@/lib/prismaClient';

export function validateSubscriptionData(data: any) {
    if (!data.userId) {
        return handleSubscriptionError(
            'Missing user ID',
            'STRIPE_VALIDATION_FAILED',
            { data }
        );
    }

    if (!data.stripeSubscription?.id) {
        return handleSubscriptionError(
            'Invalid Stripe subscription',
            'STRIPE_VALIDATION_FAILED',
            { data }
        );
    }

    if (!data.productDetails?.id) {
        return handleSubscriptionError(
            'Invalid product details',
            'STRIPE_VALIDATION_FAILED',
            { data }
        );
    }

    return true;
}

export function validateCredits(credits: string) {
    const numCredits = parseInt(credits, 10);
    if (isNaN(numCredits) || numCredits < 0) {
        return handleSubscriptionError(
            'Invalid credits value',
            'STRIPE_VALIDATION_FAILED',
            { credits }
        );
    }
    return true;
}

export function validatePlanChange(currentPlan: any, newPlan: any) {
    if (!currentPlan || !newPlan) {
        return handleSubscriptionError(
            'Invalid plan data',
            'STRIPE_VALIDATION_FAILED',
            { currentPlan, newPlan }
        );
    }
    return true;
}

export async function validatePlan(productId: string) {
    const planName = Object.entries(PLAN_TO_STRIPE_PRODUCT).find(
        ([_, id]) => id === productId
    )?.[0];

    if (!planName) {
        throw new Error(`Unrecognized product ID: ${productId}`);
    }

    const plan = await prisma.plan.findFirst({
        where: { plan_name: planName }
    });

    if (!plan) {
        throw new Error(`Plan not found: ${planName}`);
    }

    return { plan, planName };
}

export function validateStripeSubscription(sub: Stripe.Subscription) {
    if (!sub.items?.data.length) {
        throw new Error("Invalid subscription: no items");
    }
    return true;
}

export function validateCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer) {
    if ('deleted' in customer) {
        throw new Error('Customer has been deleted');
    }
    return customer;
}
