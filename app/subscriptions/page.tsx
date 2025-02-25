"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";

type Plan = {
  plan_id: string;
  plan_name: string;
  credits_per_month: string;
  price: string;
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/subscriptions/plans");
      const data = await res.json();
      setPlans(data.plans);
      setCurrentPlan(data.currentPlan);
    } catch (error) {
      toast.error("Failed to load plans.");
    }
  };

  useEffect(() => {
    fetchPlans();

    if (session?.user?.id) {
      const eventSource = new EventSource(`/api/subscriptions/updates?userId=${session.user.id}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Only update if the current plan is different
        if (data.currentPlan && data.currentPlan !== currentPlan) {
          setCurrentPlan(data.currentPlan);
        }
      };

      return () => {
        eventSource.close();
      };
    }
  }, [session, currentPlan]); // Add currentPlan to dependencies

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) {
      toast.info("You're already on this plan.");
      return;
    }

    try {
      const res = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Subscription error:", errorData);
        toast.error(errorData.error || "Failed to create subscription.");
        return;
      }

      const data = await res.json();
      if (data.success) {
        router.push(`/stripe-checkout?planId=${planId}`);
      } else {
        toast.error(data.error || "Failed to create subscription.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Something went wrong.");
    }
  };

  const handleChangePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleConfirmChangePlan = () => {
    if (selectedPlan) {
      handleSubscribe(selectedPlan.plan_id);
      setIsModalOpen(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Choose the Best Plan for You
          </h1>
          <p className="mt-2 text-gray-600">
            Get access to AI models and exclusive features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.plan_id === currentPlan;
            const isPro = plan.plan_name.toLowerCase().includes("pro");

            return (
              <div
                key={plan.plan_id}
                className={`relative flex flex-col items-center p-6 rounded-2xl shadow-lg bg-white 
                border-2 ${isPro ? "border-blue-600" : "border-gray-200"}
                hover:shadow-xl transition-all duration-300`}
              >
                {/* Pro Plan Badge */}
                {isPro && (
                  <p className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 bg-blue-600 
                    text-white text-sm font-semibold rounded-full tracking-wide">
                    Most Popular
                  </p>
                )}

                {/* Plan Name */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {plan.plan_name}
                </h2>

                {/* Price */}
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
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        {feature}
                      </li>
                    ))}
                </ul>

                {/* Subscribe Button */}
                <button
                  onClick={() => handleChangePlan(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-lg text-sm font-semibold
                    ${isCurrentPlan
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : isPro
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-gray-900 text-white hover:bg-gray-800"}
                    transition-all duration-300`}
                >
                  {isCurrentPlan ? "Current Plan" : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button onClick={() => router.push("/")} className="text-blue-600 hover:underline">
            Back to Dashboard
          </button>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmChangePlan}
          planName={selectedPlan?.plan_name || ""}
        />
      </div>
    </div>
  );
}
