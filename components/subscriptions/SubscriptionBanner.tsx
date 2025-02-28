import { SubscriptionBannerProps } from '@/types/subscriptions/subscription';

export const SubscriptionBanner = ({ details, onRestore, onCancel, formatDate }: SubscriptionBannerProps) => {
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
