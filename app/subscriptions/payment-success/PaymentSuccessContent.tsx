'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const processSuccess = async () => {
            const from = searchParams.get('from');
            const plan = searchParams.get('plan');

            console.log('🎉 Processing success:', { from, plan });

            try {
                // Show progress bar
                for (let i = 0; i <= 100; i += 20) {
                    setProgress(i);
                    await delay(300);
                }

                // Redirect with result
                const redirectUrl = new URL('/subscriptions', window.location.origin);
                redirectUrl.searchParams.set('result', 'success');
                redirectUrl.searchParams.set('from', 'stripe');
                if (plan) redirectUrl.searchParams.set('plan', plan);

                console.log('➡️ Redirecting to:', redirectUrl.toString());
                router.push(redirectUrl.toString());
            } catch (error) {
                console.error('❌ Error:', error);
                router.push('/subscriptions?result=error');
            }
        };

        processSuccess();
    }, [router, searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold mb-6">Payment Success</h1>
            <p className="text-gray-600 mb-8">Your payment was successful. Updating subscription...</p>

            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
} 