import { Stripe } from 'stripe';
import { logWebhookEvent } from '@/utils/subscriptions/webhookLogger';
import { getStripeProductDetails } from '@/services/subscriptions/stripeService';
import { handleSubscriptionProcess } from './subscriptionHandler';

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    try {
        logWebhookEvent('checkout.session.completed', { sessionId: session.id });

        if (!session.subscription) {
            throw new Error('Missing Stripe subscription ID');
        }

        if (!session.client_reference_id) {
            throw new Error('Missing client reference ID (userId)');
        }

        // Get Stripe details
        const stripeDetails = await getStripeProductDetails(session.subscription as string);

        logWebhookEvent('stripe_details_fetched', {
            subscriptionId: stripeDetails.stripeSubscription.id,
            customerId: stripeDetails.stripeCustomer.id,
            productId: stripeDetails.productDetails.id
        });

        // Process subscription
        const result = await handleSubscriptionProcess({
            userId: session.client_reference_id,
            ...stripeDetails,
            activeSubscriptionIds: JSON.parse(session.metadata?.activeSubscriptionIds || '[]')
        });

        logWebhookEvent('subscription_created', {
            subscriptionId: result.subscription_id,
            userId: session.client_reference_id
        });

        return { success: true, subscriptionId: result.subscription_id };
    } catch (error) {
        logWebhookEvent('checkout_error', { error, sessionId: session.id });
        throw error;
    }
}
