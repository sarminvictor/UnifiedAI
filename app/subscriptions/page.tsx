"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/subscriptions/index";
import { PlanGrid } from "@/components/subscriptions/PlanGrid";
import { SubscriptionModals } from "@/components/subscriptions/SubscriptionModals";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

function SubscriptionPageContent() {
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    plans,
    isLoading,
    subscribeToPlan,
    subscriptionDetails,
    restoreSubscription,
    getButtonText,
    getButtonStyle,
    canChangePlan,
    isCurrentPlanActive,
    isPendingDowngrade,
    formatDate
  } = useSubscription();

  // Remove local subscription management, use hook's functions instead
  const handlePlanAction = async (planId: string) => {
    if (isCurrentPlanActive(planId) && subscriptionDetails?.isDowngradePending) {
      handleRestoreSubscription();
      return;
    }

    // Add immediate UI feedback for Free plan
    if (plans.find(p => p.plan_id === planId)?.plan_name.toLowerCase() === 'free') {
      // This logic should be moved to the hook
      await subscribeToPlan(planId);
    } else {
      const result = await subscribeToPlan(planId);
      if (!result) {
        setSelectedPlanId(planId);
        setIsCancelModalOpen(true);
      }
    }
  };

  const handleRestoreSubscription = async () => {
    try {
      await restoreSubscription();
      setIsRestoreModalOpen(false);
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Failed to restore subscription. Please try again.");
    }
  };

  const handleConfirmChangePlan = async () => {
    if (!selectedPlanId) return;

    try {
      const result = await subscribeToPlan(selectedPlanId);
      if (result) {
        setIsCancelModalOpen(false);
        setSelectedPlanId(null);
      }
    } catch (error) {
      console.error('Plan change error:', error);
      toast.error('Failed to change plan. Please try again.');
    }
  };

  // Payment result handling
  useEffect(() => {
    const showPaymentResult = async () => {
      const result = searchParams.get('result');
      const from = searchParams.get('from');

      if (from === 'stripe') {
        switch (result) {
          case 'success':
            toast.success('Subscription updated successfully!');
            break;
          case 'failed':
            toast.error('Payment was canceled. Please try again.');
            break;
          case 'error':
            toast.error('Something went wrong. Please try again.');
            break;
        }
        window.history.replaceState({}, '', '/subscriptions');
      }
    };

    showPaymentResult();
  }, [searchParams]);

  const getSelectedPlanName = () => {
    if (!selectedPlanId) return "";
    const plan = plans.find(p => p.plan_id === selectedPlanId);
    return plan ? plan.plan_name : "";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-start">
          <button
            onClick={() => router.push('/')}
            className="back-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      </div>

      {/* Centered Plans Grid */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-6xl">
          <PlanGrid
            plans={plans}
            currentPlanId={subscriptionDetails?.planId || null}
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
        </div>
      </div>

      {/* Modals */}
      <SubscriptionModals
        isRestoreOpen={isRestoreModalOpen}
        isChangeOpen={isCancelModalOpen}
        onRestoreClose={() => setIsRestoreModalOpen(false)}
        onChangeClose={() => setIsCancelModalOpen(false)}
        onRestoreConfirm={handleRestoreSubscription}
        onChangeConfirm={handleConfirmChangePlan}
        selectedPlan={getSelectedPlanName()}
      />
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">Subscription Plans</h1>
        <p className="text-gray-600 mb-8">Loading subscription details...</p>
        <div className="animate-pulse w-full max-w-6xl flex justify-center space-x-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg p-6 w-72 h-96" />
          ))}
        </div>
      </div>
    }>
      <SubscriptionPageContent />
    </Suspense>
  );
}