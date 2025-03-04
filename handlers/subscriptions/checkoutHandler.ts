import { Stripe } from 'stripe';
import { logWebhookEvent } from '@/utils/subscriptions/webhookLogger';
import { getStripeProductDetails } from '@/services/subscriptions/stripeService';
import { handleSubscriptionProcess } from './subscriptionHandler';

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    try {
        logWebhookEvent('checkout.session.completed', { sessionId: session.id });

        if (!session.subscription || !session.client_reference_id) {
            throw new Error('Missing required session data');
        }

        // Get Stripe details
        const stripeDetails = await getStripeProductDetails(session.subscription as string);

        // Process subscription and ensure we get result
        const newSubscription = await handleSubscriptionProcess({
            userId: session.client_reference_id,
            ...stripeDetails,
            activeSubscriptionIds: JSON.parse(session.metadata?.activeSubscriptionIds || '[]')
        });

        if (!newSubscription?.subscription_id) {
            throw new Error('Failed to create subscription');
        }

        logWebhookEvent('subscription_created', {
            subscriptionId: newSubscription.subscription_id,
            userId: session.client_reference_id
        });

        return { success: true, subscriptionId: newSubscription.subscription_id };
    } catch (error) {
        logWebhookEvent('checkout_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            sessionId: session.id
        });
        throw error;
    }
}
