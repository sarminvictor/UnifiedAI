"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { toast } from "sonner";

// Types definition
type PlanGridProps = {
  plans: Array<{
    plan_id: string;
    plan_name: string;
    price: string;
    credits_per_month: string;
  }>;
  currentPlanId: string | null;
  isLoading: boolean;
  isPendingDowngrade: boolean;
  onPlanSelect: (planId: string) => void;
  isCurrentPlanActive: (planId: string) => boolean;
  isPendingDowngradeCheck: (planId: string) => boolean;
  canChangePlan: (planId: string) => boolean;
  getButtonText: (planId: string) => string;
  getButtonStyle: (planId: string, isPro: boolean) => string;
  subscriptionDetails?: { renewalDate: string } | null;
  formatDate: (date?: string) => string;
};

// PlanGrid component
const PlanGrid = ({
  plans,
  currentPlanId,
  isLoading,
  onPlanSelect,
  isCurrentPlanActive,
  isPendingDowngradeCheck,
  canChangePlan,
  getButtonText,
  getButtonStyle,
  subscriptionDetails,
  formatDate
}: PlanGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrentPlan = isCurrentPlanActive(plan.plan_id);
        const isPendingPlan = isPendingDowngradeCheck(plan.plan_id);
        const isPro = plan.plan_name.toLowerCase().includes("pro");

        return (
          <div
            key={plan.plan_id}
            className={`relative flex flex-col items-center p-6 rounded-2xl shadow-lg bg-white 
              border-2 ${isPro
                ? "border-blue-600"
                : isPendingPlan
                  ? "border-amber-500"
                  : "border-gray-200"
              }
              hover:shadow-xl transition-all duration-300`}
          >
            {/* Pro Badge */}
            {isPro && (
              <p className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 bg-blue-600 
                text-white text-sm font-semibold rounded-full tracking-wide">
                Most Popular
              </p>
            )}

            {/* Plan Details */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {plan.plan_name}
            </h2>

            <div className="flex items-baseline mb-4">
              <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-lg text-gray-600 ml-1">/month</span> {/* Fixed class to className */}
            </div>

            {/* Features List */}
            <ul className="text-sm text-gray-600 space-y-3 mb-6 w-full px-6">
              {[
                "Access to all AI models",
                `${plan.credits_per_month} credits per month`,
                isPro ? "Priority support" : "Standard support",
                isPro && "API access",
              ]
                .filter(Boolean)
                .map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
            </ul>

            {/* Restore Button */}
            <button
              onClick={() => onPlanSelect(plan.plan_id)}
              disabled={!canChangePlan(plan.plan_id)}
              className={`w-full py-3 rounded-lg text-sm font-semibold
            ${getButtonStyle(plan.plan_id, isPro)}
            transition-all duration-300`}
            >
              {getButtonText(plan.plan_id)}
            </button>

            {isPendingPlan && (
              <p className="mt-2 text-sm text-amber-600">
                Downgrading after {formatDate(subscriptionDetails?.renewalDate)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Banner component
const CurrentSubscriptionBanner = ({ details, onRestore, onCancel, formatDate }) => {
  if (!details) return null;
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Current Subscription
        </h2>

        <div className={`p-4 rounded-lg ${details.isDowngradePending ? 'bg-amber-50' : 'bg-blue-50'}`}>
          <p className="text-lg font-medium mb-2">{details.planName} Plan</p>

          {details.isDowngradePending ? (
            <>
              <p className="text-amber-700 mb-2">
                ⚠️ You will be switched to the Free plan on{" "}
                <strong>{formatDate(details.renewalDate)}</strong>.
              </p>
              <button
                onClick={onRestore}
                className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors"
              >
                Restore Current Plan
              </button>
            </>
          ) : (
            <>
              <p className="text-blue-700">
                Next billing date: <strong>{formatDate(details.renewalDate)}</strong>
              </p>
              <p className="text-sm text-blue-600 mt-2">
                💰 {details.creditsRemaining} credits remaining
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Main component
export default function SubscriptionPage() {
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [localCurrentPlanId, setLocalCurrentPlanId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    plans,
    isLoading,
    subscribeToPlan
  } = useSubscription();

  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    planName: string;
    renewalDate: string;
    isDowngradePending: boolean;
    creditsRemaining: string;
    planId: string; // Added planId to type
  } | null>(null);

  const isCurrentPlanActive = (planId: string) => {
    if (!subscriptionDetails) return false;
    // Consider both active and pending downgrade as "current"
    return planId === localCurrentPlanId;
  };

  const isPendingDowngrade = (planId: string) => {
    if (!subscriptionDetails) return false;
    return planId === localCurrentPlanId && subscriptionDetails.isDowngradePending;
  };

  const getButtonText = (planId: string) => {
    if (isLoading) return "Processing...";

    console.log("🔍 Checking Button Text for:", planId);
    console.log("🔍 Current Plan ID:", localCurrentPlanId);
    console.log("🔍 Subscription Details:", subscriptionDetails);

    // Ensure subscriptionDetails exists before checking
    if (!subscriptionDetails) return "Subscribe";

    // ✅ If this plan is the active plan AND pending downgrade
    if (subscriptionDetails.isDowngradePending && planId === localCurrentPlanId) {
      return "Restore plan";  // ✅ Show correct text
    }

    // ✅ If this plan is the currently active plan but NOT pending downgrade
    if (planId === localCurrentPlanId) {
      return "Current Plan";
    }

    // ✅ All other plans should still show Subscribe
    return "Subscribe";
  };

  const getButtonStyle = (planId: string, isPro: boolean) => {
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
      : "bg-gray-900 text-white hover:bg-gray-800";
  };

  const canChangePlan = (planId: string) => {
    // Allow to click on Pending plan
    if (isPendingDowngrade(planId)) {
      return true;
    }


    // Always disable current plan button
    if (isCurrentPlanActive(planId)) {
      return false;
    }

    // Can't change if no current plan data
    if (!localCurrentPlanId || !subscriptionDetails) {
      return true;
    }

    // Can't subscribe to new plan if current plan is pending downgrade
    if (subscriptionDetails.isDowngradePending) {
      return false;
    }

    // Can't change if loading
    if (isLoading) {
      return false;
    }

    return true;
  };

  // Initial subscription details fetch
  useEffect(() => {
    let isMounted = true;

    async function fetchSubscriptionDetails() {
      try {
        const res = await fetch('/api/subscriptions/current');
        if (!isMounted) return; // Prevent updates if component unmounts

        if (res.ok) {
          const data = await res.json();
          console.log("📡 Updated Subscription Details:", data);
          setSubscriptionDetails(data);
          setLocalCurrentPlanId(data.planId || null);
        }
      } catch (error) {
        console.error('Failed to load subscription details:', error);
      }
    }

    fetchSubscriptionDetails();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, []); // Empty dependency array for mount-only execution

  // Real-time updates via SSE
  useEffect(() => {
    const eventSource = new EventSource(`/api/subscriptions/updates`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Subscription Update:', data);

        if (data.type === 'subscription_updated') {
          setSubscriptionDetails(data.details);
          setLocalCurrentPlanId(data.details.planId || null);
        }
      } catch (error) {
        console.error("Error processing subscription update:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Connection error:', error);
      eventSource.close();
    };

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
    };
  }, []); // Only connect SSE once on mount

  useEffect(() => {
    const showPaymentResult = async () => {
      const result = searchParams.get('result');
      const from = searchParams.get('from');
      const plan = searchParams.get('plan');

      console.log('🔍 Payment result:', { result, from, plan });

      if (from === 'stripe') {
        switch (result) {
          case 'success':
            console.log('✨ Payment successful');
            toast.success('Subscription updated successfully!');
            break;
          case 'failed':
            console.log('❌ Payment failed');
            toast.error('Payment was canceled. Please try again.');
            break;
          case 'error':
            console.log('⚠️ Payment error');
            toast.error('Something went wrong. Please try again.');
            break;
        }

        // Clean URL after showing toast
        console.log('🧹 Cleaning URL');
        window.history.replaceState({}, '', '/subscriptions');
      }
    };

    showPaymentResult();
  }, [searchParams]);

  const handleChangePlan = (planId: string) => {
    setSelectedPlanId(planId);
    setIsCancelModalOpen(true);
  };

  const handlePlanAction = async (planId: string) => {
    // If restoring current plan
    if (isCurrentPlanActive(planId) && subscriptionDetails?.isDowngradePending) {
      handleRestoreSubscription();
      return;
    }

    // If downgrading to Free
    const selectedPlan = plans.find(p => p.plan_id === planId);
    if (selectedPlan?.plan_name.toLowerCase() === 'free') {
      // Immediate UI update (like in restore)
      setSubscriptionDetails(prev => ({
        ...prev,
        isDowngradePending: true,
        // Keep other details the same
      }));
    }

    // Continue with normal flow
    const result = await subscribeToPlan(planId);
    // Backend will confirm through SSE
  };

  const handleConfirmChangePlan = async () => {
    if (!selectedPlanId) return;

    try {
      const selectedPlan = plans.find(p => p.plan_id === selectedPlanId);
      const isFreeDowngrade = selectedPlan?.plan_name.toLowerCase() === 'free';

      const result = await subscribeToPlan(selectedPlanId);

      // ✅ Ensure UI updates immediately
      if (result.success) {
        setSubscriptionDetails(prev => prev ? {
          ...prev,
          isDowngradePending: isFreeDowngrade,
          renewalDate: result.endDate,
          planName: isFreeDowngrade ? "Free" : selectedPlan?.plan_name,
          planId: selectedPlanId
        } : prev);

        // ✅ Force fetch latest subscription details
        await fetchSubscriptionDetails();

        toast.success(`Subscription updated to ${selectedPlan?.plan_name}`);
      }

      setIsCancelModalOpen(false);
      setSelectedPlanId(null);
    } catch (error) {
      console.error('Plan change error:', error);
      toast.error('Failed to change plan. Please try again.');
    }
  };

  const handleRestoreSubscription = async () => {
    try {
      const res = await fetch("/api/subscriptions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Immediately update UI state
      setSubscriptionDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          isDowngradePending: false
        };
      });

      toast.success(`Auto-renewal restored for ${subscriptionDetails?.planName} plan`);
      setIsRestoreModalOpen(false);

      // Trigger a refresh of subscription details
      await fetchSubscriptionDetails();
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Failed to restore subscription. Please try again.");
    }
  };

  // Add this function for manual refresh
  const fetchSubscriptionDetails = async () => {
    try {
      const res = await fetch('/api/subscriptions/current');
      if (!res.ok) throw new Error('Failed to fetch subscription details');

      const data = await res.json();
      console.log('📡 Fetched subscription details:', data);

      setSubscriptionDetails(data);
      setLocalCurrentPlanId(data.planId || null);

      return data;
    } catch (error) {
      console.error('Failed to refresh subscription details:', error);
      toast.error('Failed to update subscription information');
    }
  };

  const getSelectedPlanName = () => {
    if (!selectedPlanId) return "";
    const plan = plans.find(p => p.plan_id === selectedPlanId);
    return plan ? plan.plan_name : "";
  }

  const getModalContent = () => {
    if (!selectedPlanId || !plans.length) return { title: "", description: "" };
    const selectedPlan = plans.find(p => p.plan_id === selectedPlanId);
    const currentPlanName = subscriptionDetails?.planName || "Free";

    if (selectedPlan?.plan_name.toLowerCase() === 'free') {
      return {
        title: "Confirm Downgrade",
        description: `Are you sure you want to downgrade from ${currentPlanName} to Free plan? Your current features will remain active until the end of the billing period.`
      };
    }

    return {
      title: "Confirm Subscription Change",
      description: `Are you sure you want to subscribe to the ${selectedPlan?.plan_name} plan? You'll be charged ${selectedPlan?.price}$ monthly.`
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-4xl w-full">
        <CurrentSubscriptionBanner
          details={subscriptionDetails}
          onRestore={() => setIsRestoreModalOpen(true)}
          onCancel={() => setIsCancelModalOpen(true)}
          formatDate={formatDate}
        />

        <PlanGrid
          plans={plans}
          currentPlanId={localCurrentPlanId}
          isLoading={isLoading}
          isPendingDowngrade={!!subscriptionDetails?.isDowngradePending}
          onPlanSelect={handlePlanAction}
          isCurrentPlanActive={isCurrentPlanActive}
          isPendingDowngradeCheck={isPendingDowngrade}
          canChangePlan={canChangePlan}
          getButtonText={getButtonText}
          getButtonStyle={getButtonStyle}
          subscriptionDetails={subscriptionDetails}
          formatDate={formatDate}
        />

        {/* Modals */}
        <ConfirmationModal
          isOpen={isRestoreModalOpen}
          onClose={() => setIsRestoreModalOpen(false)}
          onConfirm={handleRestoreSubscription}
          title="Restore Subscription"
          description={`Continue your ${subscriptionDetails?.planName} plan with automatic renewal?`}
        />

        <ConfirmationModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleConfirmChangePlan}
          {...getModalContent()}
        />
      </div>
    </div>
  );
}
