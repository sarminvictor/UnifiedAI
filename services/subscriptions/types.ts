import { Stripe } from 'stripe';

export interface StripeProductDetails {
    stripeSubscription: Stripe.Subscription;
    stripeCustomer: Stripe.Customer;
    productDetails: Stripe.Product;
}

export interface SubscriptionCheckoutData {
    userId: string;
    stripeSubscription: Stripe.Subscription;
    stripeCustomer: Stripe.Customer;
    productDetails: Stripe.Product;
    activeSubscriptionIds: Array<{ id: string; stripeId: string }>;
}

export interface SubscriptionUpdateData {
    userId: string;
    subscriptionId: string;
    status: string;
    endDate: Date;
    stripeInfo: string;
}

export interface CreditTransactionData {
    userId: string;
    subscriptionId: string;
    creditsDeducted: string;
    creditsAdded: string;
    description: string;
    paymentMethod?: string;
}

export interface DatabaseModels {
    Subscription: {
        subscription_id: string;
        user_id: string;
        plan_id: string;
        status: 'Active' | 'Canceled' | 'Pending Downgrade';
        start_date: Date;
        end_date: Date;
        payment_status: 'Paid' | 'Free' | 'Failed';
        stripe_payment_id: string;
        stripe_info: string;
        created_at: Date;
        updated_at: Date;
    };
    Plan: {
        plan_id: string;
        plan_name: string;
        credits_per_month: string;
    };
}

export interface TransactionResponse {
    success: boolean;
    error?: string;
    data?: any;
    metadata?: Record<string, any>;
}

export type SubscriptionErrorCode =
    | 'STRIPE_VALIDATION_FAILED'
    | 'SUBSCRIPTION_NOT_FOUND'
    | 'INVALID_PLAN'
    | 'CREDIT_UPDATE_FAILED'
    | 'DATABASE_ERROR'
    | 'STRIPE_API_ERROR';

export type SubscriptionStatus = 'Active' | 'Canceled' | 'Pending Downgrade';
