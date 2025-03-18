"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentFailed() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromStripe = searchParams.get('from') === 'stripe';
    const planId = searchParams.get('plan');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const processFailed = async () => {
            console.log('❌ Processing payment failure, fromStripe:', fromStripe, 'planId:', planId);

            try {
                await delay(500);
                setProgress(30);
                await delay(500);
                setProgress(60);
                await delay(500);
                setProgress(100);

                await delay(500);
                if (fromStripe && planId) {
                    console.log('➡️ Redirecting to subscriptions with failure status');
                    router.replace(`/subscriptions?result=failed&from=payment&plan=${planId}`);
                } else {
                    router.replace('/subscriptions');
                }
            } catch (error) {
                console.error('❌ Error in failure flow:', error);
                router.replace('/subscriptions?result=error');
            }
        };

        processFailed();
    }, [router, fromStripe, planId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold mb-6 text-red-600">Payment Failed</h1>
            <p className="text-gray-600 mb-8">Your payment was unsuccessful. Redirecting...</p>

            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
