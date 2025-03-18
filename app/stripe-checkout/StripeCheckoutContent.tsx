'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function StripeCheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [simulatingPayment, setSimulatingPayment] = useState(false);

    const handleSimulateSuccess = () => {
        setSimulatingPayment(true);
        setTimeout(() => {
            router.push('/subscriptions/payment-success?from=stripe&plan=premium');
        }, 1500);
    };

    const handleSimulateFailure = () => {
        setSimulatingPayment(true);
        setTimeout(() => {
            router.push('/subscriptions/payment-failed?from=stripe&plan=premium');
        }, 1500);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
                <h1 className="text-2xl font-bold mb-6 text-center">Stripe Checkout Simulation</h1>

                <div className="mb-6">
                    <p className="text-gray-600 mb-4">
                        This is a simulated checkout page. In a real application, you would be
                        redirected to Stripe's hosted checkout page.
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleSimulateSuccess}
                        disabled={simulatingPayment}
                        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                        {simulatingPayment ? 'Processing...' : 'Simulate Payment Success'}
                    </button>

                    <button
                        onClick={handleSimulateFailure}
                        disabled={simulatingPayment}
                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                        {simulatingPayment ? 'Processing...' : 'Simulate Payment Failure'}
                    </button>

                    <button
                        onClick={() => router.push('/subscriptions')}
                        disabled={simulatingPayment}
                        className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
} 