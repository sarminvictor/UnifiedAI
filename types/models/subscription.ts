export interface Plan {
    plan_id: string;
    plan_name: string;
    price: string;
    credits_per_month: string;
}

export interface SubscriptionDetails {
    planName: string;
    renewalDate: string;
    isDowngradePending: boolean;
    creditsRemaining: string;
    planId: string;
}
