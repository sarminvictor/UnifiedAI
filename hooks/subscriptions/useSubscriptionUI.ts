import { useCallback } from 'react';
import { useSubscriptionState } from './useSubscriptionState';

export function useSubscriptionUI(state: ReturnType<typeof useSubscriptionState>) {
    const { subscriptionDetails, currentPlanId, isLoading } = state;

    const formatDate = useCallback((dateString?: string) => {
        if (!dateString) return 'Not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    }, []);

    const isCurrentPlanActive = useCallback((planId: string) => {
        if (!subscriptionDetails) return false;
        return planId === currentPlanId;
    }, [subscriptionDetails, currentPlanId]);

    const isPendingDowngrade = useCallback((planId: string) => {
        if (!subscriptionDetails) return false;
        return planId === currentPlanId && subscriptionDetails.isDowngradePending;
    }, [subscriptionDetails, currentPlanId]);

    const canChangePlan = useCallback((planId: string) => {
        if (isPendingDowngrade(planId)) return true;
        if (isCurrentPlanActive(planId)) return false;
        if (!currentPlanId || !subscriptionDetails) return true;
        if (subscriptionDetails.isDowngradePending) return false;
        if (isLoading) return false;
        return true;
    }, [isPendingDowngrade, isCurrentPlanActive, currentPlanId, subscriptionDetails, isLoading]);

    const getButtonText = useCallback((planId: string) => {
        if (isLoading) return "Processing...";
        if (!subscriptionDetails) return "Subscribe";
        if (subscriptionDetails.isDowngradePending && planId === currentPlanId) {
            return "Restore plan";
        }
        if (planId === currentPlanId) {
            return "Current Plan";
        }
        return "Subscribe";
    }, [isLoading, subscriptionDetails, currentPlanId]);

    const getButtonStyle = useCallback((planId: string, isPro: boolean) => {
        if (isCurrentPlanActive(planId)) {
            return subscriptionDetails?.isDowngradePending
                ? "bg-amber-600 text-white cursor-pointer hover:bg-amber-500"
                : "bg-gray-200 text-gray-400 cursor-not-allowed";
        }

        if (!canChangePlan(planId)) {
            return "bg-gray-200 text-gray-400 cursor-not-allowed";
        }

        if (isLoading) {
            return "bg-gray-300 text-gray-400 cursor-not-allowed";
        }

        return isPro
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "bg-gray-200 text-gray-400 hover:bg-gray-800";
    }, [isCurrentPlanActive, subscriptionDetails, canChangePlan, isLoading]);

    return {
        formatDate,
        isCurrentPlanActive,
        isPendingDowngrade,
        canChangePlan,
        getButtonText,
        getButtonStyle,
    };
}
