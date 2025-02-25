import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";

// Store processed request IDs with timestamps
const processedRequests = new Map<string, number>();

const cleanupProcessedRequests = () => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  processedRequests.forEach((timestamp, id) => {
    if (timestamp < fiveMinutesAgo) processedRequests.delete(id);
  });
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || 
                   `sub_${new Date().toISOString().slice(0,10)}_${Math.random().toString(36).slice(-4)}`;

  if (processedRequests.has(requestId)) {
    return NextResponse.json({ 
      success: false, 
      error: "Request already processed"
    });
  }

  try {
    const { planId, status } = await request.json();
    console.log(`Processing subscription ${status} - Plan: ${planId}`);

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findFirst({
        where: { 
          plan_id: planId, 
          status: "Pending",
          payment_status: "Pending"
        },
        include: { 
          user: true, 
          plan: true
        }
      });

      if (!subscription) {
        throw new Error("Pending subscription not found");
      }

      if (status === "Active") {
        // Handle successful payment
        const currentActive = await tx.subscription.findFirst({
          where: {
            user_id: subscription.user_id,
            status: "Active"
          },
          include: { plan: true }
        });

        if (currentActive) {
          await tx.subscription.update({
            where: { subscription_id: currentActive.subscription_id },
            data: {
              status: "Canceled",
              end_date: new Date()
            }
          });
        }

        // Add credits for new subscription
        await tx.creditTransaction.create({
          data: {
            user_id: subscription.user_id,
            subscription_id: subscription.subscription_id,
            credits_added: subscription.plan.credits_per_month,
            credits_deducted: currentActive ? subscription.user.credits_remaining : "0",
            payment_method: "System",
            description: `Plan change: ${currentActive ? currentActive.plan.plan_name : 'None'} to ${subscription.plan.plan_name}`
          }
        });

        // Update user's credits
        await tx.user.update({
          where: { id: subscription.user_id },
          data: { credits_remaining: subscription.plan.credits_per_month }
        });

        // Activate subscription
        return await tx.subscription.update({
          where: { subscription_id: subscription.subscription_id },
          data: { 
            status: "Active",
            payment_status: "Paid"
          }
        });
      } else if (status === "Failed") {
        // Handle failed payment
        const currentActive = await tx.subscription.findFirst({
          where: {
            user_id: subscription.user_id,
            status: "Active"
          }
        });

        // If there's a current active subscription, keep it active
        if (currentActive) {
          // No changes to the current active subscription
          console.log("Keeping existing active subscription");
        }

        // Mark the pending subscription as failed
        return await tx.subscription.update({
          where: { subscription_id: subscription.subscription_id },
          data: {
            status: "Failed",
            payment_status: "Failed",
            end_date: new Date() // End the failed subscription immediately
          }
        });
      }
    });

    processedRequests.set(requestId, Date.now());
    cleanupProcessedRequests();

    console.log(`Subscription ${status} completed successfully`);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Subscription update error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update subscription status"
    });
  }
}
