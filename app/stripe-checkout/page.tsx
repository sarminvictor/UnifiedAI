"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutContent() {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Mock Checkout Page</h1>
      <p className="text-gray-600 mb-6">Simulate a payment process.</p>
      <div className="space-x-4">
        <button
          onClick={handlePaymentSuccess}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Simulate Successful Payment
        </button>
        <button
          onClick={handlePaymentFailure}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Simulate Failed Payment
        </button>
      </div>
    </div>
  );
}

export default function MockCheckout() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <p className="text-gray-600 mb-6">Loading checkout information...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
