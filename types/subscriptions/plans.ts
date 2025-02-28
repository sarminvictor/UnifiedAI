import { SubscriptionDetails } from "./subscription";

export interface Plan {
    plan_id: string;
    plan_name: string;
    price: string;
    credits_per_month: string;
}

export interface PlanGridProps {
    plans: Plan[];
    currentPlanId: string | null;
    isLoading: boolean;
    isPendingDowngrade: boolean;
    onPlanSelect: (planId: string) => void;
    isCurrentPlanActive: (planId: string) => boolean;
    isPendingDowngradeCheck: (planId: string) => boolean;
    canChangePlan: (planId: string) => boolean;
    getButtonText: (planId: string) => string;
    getButtonStyle: (planId: string, isPro: boolean) => string;
    subscriptionDetails?: SubscriptionDetails | null;
    formatDate: (date?: string) => string;
}
