"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from 'react';
import StripeCheckoutContent from './StripeCheckoutContent';

export default function StripeCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get("planId");

    const handlePaymentSuccess = () => {
        router.push(`/payment-success?planId=${planId}`);
    };

    const handlePaymentFailure = () => {
        router.push(`/payment-failed?planId=${planId}`);
    };

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StripeCheckoutContent />
        </Suspense>
    );
}
