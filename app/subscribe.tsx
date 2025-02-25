import React, { useState, useEffect } from "react";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/router";

const Subscribe = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else {
      fetchUserPlan();
    }
  }, [status]);

  const fetchUserPlan = async () => {
    try {
      const response = await fetch("/api/chat/getUserPlan");
      const data = await response.json();
      if (data.success) {
        setCurrentPlan(data.plan);
      }
    } catch (error) {
      console.error("Error fetching user plan:", error);
    }
  };

  const handleSubscribe = async (plan: string) => {
    if (currentPlan) {
      const confirmChange = confirm(
        "You already have an active subscription. Are you sure you want to activate a new subscription? Your subscription date and credits will be updated based on your new plan."
      );
      if (!confirmChange) return;
    }

    try {
      const response = await fetch("/api/chat/subscribeUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Subscription activated successfully!");
        fetchUserPlan(); // Refresh the current plan
      } else {
        alert("Failed to activate subscription.");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Choose Your Plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Starter Plan */}
        <div className={`p-6 border rounded-lg shadow-md bg-white ${currentPlan === "Starter" ? "border-blue-500" : ""}`}>
          <h2 className="text-xl font-semibold mb-2">Starter Plan</h2>
          <p className="text-gray-600">$9.99/month - 1,000 tokens</p>
          {currentPlan === "Starter" ? (
            <p className="text-green-600 mt-2">Current Plan</p>
          ) : (
            <button
              onClick={() => handleSubscribe("Starter")}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Subscribe
            </button>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`p-6 border rounded-lg shadow-md bg-white ${currentPlan === "Pro" ? "border-blue-500" : ""}`}>
          <h2 className="text-xl font-semibold mb-2">Pro Plan</h2>
          <p className="text-gray-600">$19.99/month - 2,500 tokens</p>
          {currentPlan === "Pro" ? (
            <p className="text-green-600 mt-2">Current Plan</p>
          ) : (
            <button
              onClick={() => handleSubscribe("Pro")}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Subscribe
            </button>
          )}
        </div>
      </div>
      <button className="mt-6 text-blue-500 underline" onClick={() => router.push("/")}>
        Back to Dashboard
      </button>
    </div>
  );
};

// Server-side authentication
export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default Subscribe;
