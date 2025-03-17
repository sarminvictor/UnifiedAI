import { PlanGridProps } from '@/types/subscriptions/plans';
import { Check } from 'lucide-react';

export const PlanGrid = ({
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
                const isCurrentPlan = isCurrentPlanActive(plan.plan_id);
                const isPendingPlan = isPendingDowngradeCheck(plan.plan_id);
                const isPro = plan.plan_name.toLowerCase().includes("pro");

                return (
                    <div
                        key={plan.plan_id}
                        className={`plan-card ${isPro || isCurrentPlan ? "plan-card-border-highlight" : "plan-card-border-default"}`}
                    >
                        {isPro && !isCurrentPlan && (
                            <div className="plan-badge">
                                <span className="plan-badge-text">
                                    Most Popular
                                </span>
                            </div>
                        )}

                        {isCurrentPlan && (
                            <div className="plan-badge">
                                <span className="plan-badge-text">
                                    Most Popular
                                </span>
                            </div>
                        )}

                        <div className="w-full flex flex-col flex-grow">
                            <div className="text-center">
                                <h2 className="plan-title">{plan.plan_name}</h2>

                                <div className="plan-price-container">
                                    <span className="plan-price">${plan.price}</span>
                                    <span className="plan-price-period">/month</span>
                                </div>
                            </div>

                            {/* Current Subscription Details */}
                            {isCurrentPlan && subscriptionDetails && (
                                <div className={`subscription-details ${subscriptionDetails.isDowngradePending ? 'subscription-details-downgrade' : 'subscription-details-active'}`}>
                                    {subscriptionDetails.isDowngradePending ? (
                                        <>
                                            <p className="subscription-text-downgrade">
                                                Switching to Free plan: {formatDate(subscriptionDetails.renewalDate)}
                                            </p>
                                            <p className="subscription-text-downgrade mt-2">
                                                💰 {subscriptionDetails.creditsRemaining} credits remaining
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="subscription-text-active">
                                                Next billing: {formatDate(subscriptionDetails.renewalDate)}
                                            </p>
                                            <p className="subscription-text-active mt-2">
                                                💰 {subscriptionDetails.creditsRemaining} credits remaining
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Features List */}
                            <div className="features-list">
                                {[
                                    "Access to all AI models",
                                    `${plan.credits_per_month} credits per month`,
                                ].map((feature, index) => (
                                    <div key={index} className="feature-item">
                                        <Check className="feature-check" />
                                        <span className="feature-text">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="plan-button-container">
                                {isPendingPlan && (
                                    <p className="downgrade-message">
                                        Downgrading after {formatDate(subscriptionDetails?.renewalDate)}
                                    </p>
                                )}

                                {!isCurrentPlan || subscriptionDetails?.isDowngradePending ? (
                                    <button
                                        onClick={() => onPlanSelect(plan.plan_id)}
                                        disabled={!canChangePlan(plan.plan_id)}
                                        className={`plan-button ${isCurrentPlan && subscriptionDetails?.isDowngradePending
                                                ? "plan-button-restore"
                                                : isCurrentPlan
                                                    ? "plan-button-current"
                                                    : isPro
                                                        ? "plan-button-pro"
                                                        : "plan-button-free"
                                            }`}
                                    >
                                        {getButtonText(plan.plan_id)}
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="plan-button plan-button-current"
                                    >
                                        Current Plan
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
