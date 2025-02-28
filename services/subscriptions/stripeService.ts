import stripeClient from '@/utils/subscriptions/stripe';
import { StripeProductDetails } from '@/services/subscriptions/types';
import { validateCustomer } from '@/utils/subscriptions/validator';
import { logWebhookEvent } from '@/utils/subscriptions/webhookLogger';

export async function cancelStripeSubscription(stripeId: string) {
    if (!stripeId || stripeId === 'free_tier') return true;

    try {
        await stripeClient.subscriptions.cancel(stripeId);
        return true;
    } catch (error) {
        logWebhookEvent('stripe_cancel_error', { error, stripeId });
        return false;
    }
}

export async function getStripeProductDetails(subscriptionId: string): Promise<StripeProductDetails> {
    const stripeSubscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    const stripeCustomer = validateCustomer(
        await stripeClient.customers.retrieve(stripeSubscription.customer as string)
    );
    const productDetails = await stripeClient.products.retrieve(
        stripeSubscription.items.data[0].price.product as string
    );

    return { stripeSubscription, stripeCustomer, productDetails };
}
