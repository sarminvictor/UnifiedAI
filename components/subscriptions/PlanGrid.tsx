import { PlanGridProps } from '@/types/subscriptions/plans';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
                const isCurrentPlan = isCurrentPlanActive(plan.plan_id);
                const isPendingPlan = isPendingDowngradeCheck(plan.plan_id);
                const isPro = plan.plan_name.toLowerCase().includes("pro");

                return (
                    <div
                        key={plan.plan_id}
                        className={`relative flex flex-col items-center p-6 rounded-2xl shadow-lg bg-white 
                            border-2 ${isPro ? "border-blue-600" : isPendingPlan ? "border-amber-500" : "border-gray-200"}
                            hover:shadow-xl transition-all duration-300`}
                    >
                        {isPro && (
                            <p className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 bg-blue-600 
                                text-white text-sm font-semibold rounded-full tracking-wide">
                                Most Popular
                            </p>
                        )}

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{plan.plan_name}</h2>

                        <div className="flex items-baseline mb-4">
                            <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                            <span className="text-lg text-gray-600 ml-1">/month</span>
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
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                        </ul>

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
