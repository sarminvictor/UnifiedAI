"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { PlanGrid } from "@/components/subscriptions/PlanGrid";
import { SubscriptionBanner } from "@/components/subscriptions/SubscriptionBanner";
import { SubscriptionModals } from "@/components/subscriptions/SubscriptionModals";
import { toast } from "sonner";

export default function SubscriptionPage() {
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

    // Continue with normal flow
    const result = await subscribeToPlan(planId);
    if (!result) {
      setSelectedPlanId(planId);
      setIsCancelModalOpen(true);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-4xl w-full">
        <SubscriptionBanner
          details={subscriptionDetails}
          onRestore={() => setIsRestoreModalOpen(true)}
          onCancel={() => setIsCancelModalOpen(true)}
          formatDate={formatDate}
        />

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
    </div>
  );
}
