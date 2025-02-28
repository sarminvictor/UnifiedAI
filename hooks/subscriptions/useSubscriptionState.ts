import { useState } from 'react';
import { Plan } from '@/types/models/subscription';
import { SubscriptionAPIResponse } from '@/types/api/subscriptions';

export function useSubscriptionState() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionAPIResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    return {
        plans,
        setPlans,
        currentPlanId,
        setCurrentPlanId,
        subscriptionDetails,
        setSubscriptionDetails,
        isLoading,
        setIsLoading,
    };
}

export function usePlansState() {
    const [plans, setPlans] = useState<Plan[]>([]);
    return { plans, setPlans };
}

export function useCurrentPlanIdState() {
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    return { currentPlanId, setCurrentPlanId };
}

export function useSubscriptionDetailsState() {
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionAPIResponse | null>(null);
    return { subscriptionDetails, setSubscriptionDetails };
}

export function useLoadingState() {
    const [isLoading, setIsLoading] = useState(false);
    return { isLoading, setIsLoading };
}
