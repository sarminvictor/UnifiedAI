"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const [isUpdating, setIsUpdating] = useState(false);
  const requestAttempted = useRef(false);
  const [progress, setProgress] = useState(0);
  const [requestId] = useState(`sub_${new Date().toISOString().slice(0,10)}_${Math.random().toString(36).slice(-4)}`);

  useEffect(() => {
    if (!planId || isUpdating || requestAttempted.current) return;

    const updateSubscription = async () => {
      requestAttempted.current = true;
      setIsUpdating(true);

      // Initial delay
      await delay(2000);
      setProgress(30);

      try {
        const res = await fetch("/api/subscriptions/update-status", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Request-ID": requestId
          },
          body: JSON.stringify({ planId, status: "Active" }),
        });

        setProgress(60);
        await delay(1000);

        const data = await res.json();
        setProgress(90);
        await delay(500);

        setProgress(100);
        await delay(500);

        if (data.success) {
          toast.success("Subscription activated successfully!");
          router.push("/subscriptions");
        } else {
          toast.error(data.error || "Failed to activate subscription.");
          await delay(1000);
          router.push("/subscriptions");
        }
      } catch (error) {
        setProgress(100);
        toast.error("Something went wrong.");
        await delay(1000);
        router.push("/subscriptions");
      }
    };

    updateSubscription();
  }, [planId, router, requestId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Payment Success</h1>
      <p className="text-gray-600 mb-8">Your payment was successful. Updating subscription...</p>
      
      {/* Progress bar */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
