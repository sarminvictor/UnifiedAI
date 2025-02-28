export interface SubscriptionAPIResponse {
    planName: string;
    renewalDate: string;
    isDowngradePending: boolean;
    creditsRemaining: string;
    planId: string;
}

export interface PlansAPIResponse {
    plans: Plan[];
    currentPlan: string | null;
}

export interface SubscriptionUpdateEvent {
    type: 'subscription_updated';
    details: SubscriptionAPIResponse;
}
