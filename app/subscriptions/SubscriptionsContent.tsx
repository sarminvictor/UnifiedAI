'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/subscriptions/index";
import { SubscriptionBanner } from "@/components/subscriptions/SubscriptionBanner";
import { PlanGrid } from "@/components/subscriptions/PlanGrid";
import { SubscriptionModals } from "@/components/subscriptions/SubscriptionModals";
import { toast } from "sonner";

export default function SubscriptionsContent() {
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

    const handlePlanAction = async (planId: string) => {
        if (isCurrentPlanActive(planId) && subscriptionDetails?.isDowngradePending) {
            handleRestoreSubscription();
            return;
        }

        if (plans.find(p => p.plan_id === planId)?.plan_name.toLowerCase() === 'free') {
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
                <div className="mb-6 flex justify-start">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border 
                            border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 
                            focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

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