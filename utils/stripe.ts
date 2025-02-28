import Stripe from 'stripe';

// Only initialize Stripe on the server side
const stripe = typeof window === 'undefined'
    ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-02-24.acacia',
    })
    : null;

// Map plan names to Stripe product IDs
export const PLAN_TO_STRIPE_PRODUCT = {
    'Free': 'free_tier',
    'Starter': 'prod_RqUmGdLyUsGuxM',
    'Pro': 'prod_RqUmW0lFzzSzmW'
};

// Fetch Stripe price for a plan
export async function getStripePriceId(planName: string): Promise<string | null> {
    // Handle client-side gracefully
    if (typeof window !== 'undefined') {
        console.log('Stripe price fetching should only be done server-side');
        return null;
    }

    if (planName.toLowerCase() === 'free') {
        return null;
    }

    const productId = PLAN_TO_STRIPE_PRODUCT[planName];
    if (!productId) {
        console.error(`❌ No Stripe product mapping for plan: ${planName}`);
        return null;
    }

    try {
        if (!stripe) {
            throw new Error('Stripe not initialized');
        }

        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1
        });

        if (!prices.data.length) {
            console.error(`❌ No active price found for product: ${productId}`);
            return null;
        }

        return prices.data[0].id;
    } catch (error) {
        console.error(`❌ Error fetching Stripe price for ${planName}:`, error);
        return null;
    }
}

export default stripe;
