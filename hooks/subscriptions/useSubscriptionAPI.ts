import { useCallback } from 'react';
import { toast } from 'sonner';
import { useSubscriptionState } from './useSubscriptionState';

export function useSubscriptionAPI(state: ReturnType<typeof useSubscriptionState>) {
    const { setPlans, setCurrentPlanId, setSubscriptionDetails, setIsLoading } = state;

    const fetchPlans = useCallback(async () => {
        try {
            console.log('Fetching plans...');
            const res = await fetch("/api/subscriptions/plans");
            if (!res.ok) throw new Error("Failed to fetch plans");

            const data = await res.json();
            console.log('Received plans data:', data);
            setPlans(data.plans);
            setCurrentPlanId(data.currentPlan);
        } catch (error) {
            console.error("Error fetching plans:", error);
            toast.error("Failed to load subscription plans.");
        }
    }, [setPlans, setCurrentPlanId]);

    const fetchSubscriptionDetails = useCallback(async () => {
        try {
            console.log('🔄 Fetching subscription details...');
            const res = await fetch("/api/subscriptions/current");
            if (!res.ok) throw new Error("Failed to fetch subscription details");

            const data = await res.json();
            console.log('📡 Updated subscription details:', data);
            setSubscriptionDetails(data);
            setCurrentPlanId(data.planId || null);
            return data;
        } catch (error) {
            console.error("❌ Error fetching subscription details:", error);
            toast.error("Failed to load subscription details");
        }
    }, [setSubscriptionDetails, setCurrentPlanId]);

    const subscribeToPlan = useCallback(async (planId: string) => {
        if (planId === state.currentPlanId) {
            toast.info("You're already on this plan.");
            return false;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/subscriptions/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to create subscription.");
                return false;
            }

            if (data.success) {
                if (data.status === "Pending Downgrade" && data.details) {
                    setSubscriptionDetails(data.details);
                }

                if (data.checkoutRequired) {
                    window.location.href = data.url;
                    return true;
                }

                await fetchSubscriptionDetails();

                const selectedPlan = state.plans.find(p => p.plan_id === planId)?.plan_name;
                toast.success(`Successfully ${data.checkoutRequired ? 'initiated' : 'switched'} to ${selectedPlan || 'new'} plan!`);

                // Add immediate UI update for Free plan
                if (selectedPlan?.toLowerCase() === 'free') {
                    setSubscriptionDetails(prev => prev ? {
                        ...prev,
                        isDowngradePending: true
                    } : prev);
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error("❌ Subscription error:", error);
            toast.error("Something went wrong.");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [state.currentPlanId, state.plans, setIsLoading, setSubscriptionDetails, fetchSubscriptionDetails]);

    const restoreSubscription = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/subscriptions/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`Auto-renewal restored for ${state.subscriptionDetails?.planName} plan`);
            setSubscriptionDetails(prev => prev ? { ...prev, isDowngradePending: false } : prev);
            await fetchSubscriptionDetails();
        } catch (error) {
            console.error("Restore error:", error);
            toast.error("Failed to restore subscription. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [state.subscriptionDetails, setIsLoading, setSubscriptionDetails, fetchSubscriptionDetails]);

    const cancelSubscription = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/subscriptions/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Successfully switched to Free plan!");
            await fetchSubscriptionDetails();
        } catch (error) {
            console.error("Cancel subscription error:", error);
            toast.error("Failed to cancel subscription");
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, fetchSubscriptionDetails]);

    return {
        fetchPlans,
        fetchSubscriptionDetails,
        subscribeToPlan,
        restoreSubscription,
        cancelSubscription,
    };
}
