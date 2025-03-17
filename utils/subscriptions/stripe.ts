// DO NOT import Stripe at top level to prevent build-time initialization
// Map plan names to Stripe product IDs
export const PLAN_TO_STRIPE_PRODUCT = {
    'Free': 'free_tier',
    'Starter': 'prod_RqUmGdLyUsGuxM',
    'Pro': 'prod_RqUmW0lFzzSzmW'
} as const;

// Fallback price ID for testing purposes
export const FALLBACK_PRICE_ID_FOR_TESTING = 'price_1PXUbXJnRVkWMRYdM1zACJME';

// Dynamic loader for Stripe
export async function loadStripe() {
    // Skip during build time
    if (process.env.VERCEL_ENV === 'build') {
        return null;
    }

    try {
        const { default: Stripe } = await import('stripe');
        return process.env.STRIPE_SECRET_KEY
            ? new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2025-02-24.acacia',
            })
            : null;
    } catch (error) {
        console.error('Failed to load Stripe:', error);
        return null;
    }
}

// Fetch Stripe price for a plan
export async function getStripePriceId(planName: keyof typeof PLAN_TO_STRIPE_PRODUCT): Promise<string | null> {
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
        const stripe = await loadStripe();
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

// For backwards compatibility, but clients should use the loadStripe function
export default null;
