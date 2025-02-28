import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Plan = {
    plan_id: string;
    plan_name: string;
    credits_per_month: string;
    price: string;
};

export function useSubscription() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<{
        planName: string;
        renewalDate: string;
        isDowngradePending: boolean;
        creditsRemaining: string;
        planId: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const lastPlanRef = useRef<string | null>(null);

    const fetchPlans = useCallback(async () => {
        try {
            console.log('Fetching plans...');
            const res = await fetch("/api/subscriptions/plans");
            if (!res.ok) throw new Error("Failed to fetch plans");

            const data = await res.json();
            console.log('Received plans data:', data);

            // Use the prices from the API response instead of fetching them client-side
            setPlans(data.plans);
            setCurrentPlanId(data.currentPlan);
        } catch (error) {
            console.error("Error fetching plans:", error);
            toast.error("Failed to load subscription plans.");
        }
    }, []);

    const fetchSubscriptionDetails = useCallback(async () => {
        try {
            console.log('🔄 Fetching subscription details...');
            const res = await fetch("/api/subscriptions/current");
            if (!res.ok) throw new Error("Failed to fetch subscription details");

            const data = await res.json();
            console.log('📡 Updated subscription details:', data);

            // Immediately update local state
            setSubscriptionDetails(data);
            setCurrentPlanId(data.planId || null);

            return data;
        } catch (error) {
            console.error("❌ Error fetching subscription details:", error);
            toast.error("Failed to load subscription details");
        }
    }, []);

    const subscribeToPlan = useCallback(async (planId: string) => {
        if (planId === currentPlanId) {
            toast.info("You're already on this plan.");
            return false;
        }

        setIsLoading(true);

        try {
            console.log('🔄 Switching to plan:', planId);
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
                // Handle immediate UI update for Free plan downgrade
                if (data.status === "Pending Downgrade" && data.details) {
                    setSubscriptionDetails(data.details);
                }

                if (data.checkoutRequired) {
                    window.location.href = data.url;
                    return true;
                }

                // Force refresh subscription details
                await fetchSubscriptionDetails();

                const selectedPlan = plans.find(p => p.plan_id === planId)?.plan_name;
                toast.success(`Successfully ${data.checkoutRequired ? 'initiated' : 'switched'} to ${selectedPlan || 'new'} plan!`);
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
    }, [currentPlanId, fetchSubscriptionDetails]);

    const restoreSubscription = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Restoring subscription...');
            const res = await fetch("/api/subscriptions/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`Auto-renewal restored for ${subscriptionDetails?.planName} plan`);
            setSubscriptionDetails(prev => prev ? { ...prev, isDowngradePending: false } : prev);
            await fetchSubscriptionDetails();
        } catch (error) {
            console.error("Restore error:", error);
            toast.error("Failed to restore subscription. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [subscriptionDetails, fetchSubscriptionDetails]);

    const cancelSubscription = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('Cancelling subscription...');
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
    }, [fetchSubscriptionDetails]);

    // Enhanced SSE connection handling
    useEffect(() => {
        if (!session?.user?.id) return;

        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 3000; // 3 seconds

        const connectSSE = () => {
            console.log("🔄 Connecting to SSE...");
            const eventSourceInstance = new EventSource(`/api/subscriptions/updates`);
            eventSourceRef.current = eventSourceInstance;

            eventSourceInstance.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 SSE Update received:', data);

                    if (data.type === 'subscription_updated') {
                        await fetchSubscriptionDetails();
                    }
                } catch (error) {
                    console.error("❌ Error processing SSE update:", error);
                }
            };

            eventSourceInstance.onopen = () => {
                console.log("✅ SSE connection established");
                retryCount = 0; // Reset retry count on successful connection
            };

            eventSourceInstance.onerror = (error) => {
                console.error("❌ SSE connection error:", error);
                eventSourceInstance.close();

                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`🔄 Retrying connection (${retryCount}/${maxRetries})...`);
                    reconnectTimeoutRef.current = setTimeout(connectSSE, retryDelay);
                } else {
                    console.log("❌ Max retry attempts reached");
                }
            };

            return eventSourceInstance;
        };

        const activeEventSource = connectSSE();

        return () => {
            console.log("🔄 Cleaning up SSE connection...");
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            activeEventSource.close();
        };
    }, [session?.user?.id, fetchSubscriptionDetails]);

    // Initial data fetching when the hook is mounted
    useEffect(() => {
        fetchPlans();
        fetchSubscriptionDetails();
    }, [fetchPlans, fetchSubscriptionDetails]);

    return {
        plans,
        currentPlanId,
        subscriptionDetails,
        isLoading,
        fetchPlans,
        subscribeToPlan,
        restoreSubscription,
        cancelSubscription,
    };
}
