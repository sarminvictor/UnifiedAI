import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";
import stripe from "@/utils/subscriptions/stripe";
import { sendSubscriptionUpdate } from "@/utils/sse";
import { getStripePriceId } from '@/utils/subscriptions/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const [plan, user] = await Promise.all([
      prisma.plan.findUnique({ where: { plan_id: planId } }),
      prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          subscriptions: {
            where: { status: { in: ["Active", "Pending Downgrade"] } },
            include: { plan: true },
            orderBy: { created_at: 'desc' }
          }
        }
      })
    ]);

    if (!plan || !user) {
      return NextResponse.json(
        { error: plan ? "User not found" : "Plan not found" },
        { status: 404 }
      );
    }

    const activeSubscription = user.subscriptions[0];

    // ✅ Handle Free Plan downgrade
    if (plan.plan_name.toLowerCase() === "free") {
      if (!activeSubscription) {
        return NextResponse.json({ error: "No active subscription to downgrade from" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Mark as pending downgrade
        await tx.subscription.update({
          where: { subscription_id: activeSubscription.subscription_id },
          data: { status: "Pending Downgrade" }
        });

        if (activeSubscription.stripe_payment_id !== "free_tier" && stripe) {
          await stripe.subscriptions.update(
            activeSubscription.stripe_payment_id,
            { cancel_at_period_end: true }
          );
        }

        // Send immediate UI update with correct details
        await sendSubscriptionUpdate(user.id, {
          type: "subscription_updated",
          details: {
            planName: activeSubscription.plan.plan_name,
            planId: activeSubscription.plan_id,
            isDowngradePending: true,
            renewalDate: activeSubscription.end_date,
            creditsRemaining: user.credits_remaining
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: "Downgrade scheduled",
        status: "Pending Downgrade",
        endDate: activeSubscription.end_date,
        // Add these fields for immediate UI update
        details: {
          planName: activeSubscription.plan.plan_name,
          planId: activeSubscription.plan_id,
          isDowngradePending: true,
          renewalDate: activeSubscription.end_date,
          creditsRemaining: user.credits_remaining
        }
      });
    }

    // ✅ Handle paid plan changes
    if (!isValidPlanName(plan.plan_name)) {
      return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
    }
    const stripePriceId = await getStripePriceId(plan.plan_name as "Free" | "Starter" | "Pro");
    if (!stripePriceId) {
      console.error(`❌ Could not retrieve Stripe price ID for plan: ${plan.plan_name}`);
      return NextResponse.json({ error: "Subscription setup failed" }, { status: 500 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    // Now TypeScript knows stripePriceId is definitely a string, not null
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'] as const,
      mode: 'subscription' as const,
      line_items: [{
        price: stripePriceId, // TypeScript error fixed
        quantity: 1
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscriptions/payment-success?result=success&from=stripe&plan=${plan.plan_name}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscriptions/payment-failed?result=failed&from=stripe`,
      customer_email: session.user.email,
      client_reference_id: user.id,
      metadata: {
        planId,
        userId: user.id,
        activeSubscriptionIds: JSON.stringify(user.subscriptions.map(sub => ({
          id: sub.subscription_id,
          stripeId: sub.stripe_payment_id
        })))
      }
    });

    return NextResponse.json({
      success: true,
      checkoutRequired: true,
      url: checkoutSession.url
    });
  } catch (error) {
    console.error("❌ Subscription error:", error);
    return NextResponse.json({ error: "Subscription process failed" }, { status: 500 });
  }
}
function isValidPlanName(plan_name: string): boolean {
  const validPlans = ['starter', 'pro', 'enterprise'];
  return validPlans.includes(plan_name.toLowerCase());
}

