import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";
import { sendSubscriptionUpdate } from "@/utils/sse";

// Determine if we're in Vercel's build environment
const isBuildTime = () => {
  return process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'build';
};

// Dynamically load Stripe at runtime
const loadStripe = async () => {
  try {
    const { default: Stripe } = await import('stripe');
    return process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia',
      })
      : null;
  } catch (error) {
    console.error('Failed to load Stripe:', error);
    return null;
  }
};

// Helper function to get a Stripe price ID
async function getStripePriceId(planName: string): Promise<string | null> {
  // Handle client-side gracefully
  if (typeof window !== 'undefined') {
    console.log('Stripe price fetching should only be done server-side');
    return null;
  }

  if (planName.toLowerCase() === 'free') {
    return null;
  }

  // Load Stripe at runtime
  const stripe = await loadStripe();

  if (!stripe) {
    console.error('Stripe not initialized - missing STRIPE_SECRET_KEY');
    return null;
  }

  // Map plan names to Stripe product IDs
  const PLAN_TO_STRIPE_PRODUCT: Record<string, string> = {
    'Free': 'free_tier',
    'Starter': 'prod_RqUmGdLyUsGuxM',
    'Pro': 'prod_RqUmW0lFzzSzmW'
  };

  const productId = PLAN_TO_STRIPE_PRODUCT[planName];
  if (!productId) {
    console.error(`❌ No Stripe product mapping for plan: ${planName}`);
    return null;
  }

  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1
    });

    if (!prices.data.length) {
      console.error(`❌ No active price found for product: ${productId}`);
      return null;
    }

    return prices.data[0].id;
  } catch (error) {
    console.error(`❌ Error fetching Stripe price for ${planName}:`, error);
    return null;
  }
}

// Function to extract Stripe subscription ID from stripe_payment_id
function getStripeInfo(stripeInfo: string | null): { customerId?: string, subscriptionId?: string } {
  if (!stripeInfo) return {};

  const parts = stripeInfo.split('|');
  if (parts.length >= 3) {
    return {
      customerId: parts[1]?.trim(),
      subscriptionId: parts[2]?.trim()
    };
  }

  return {};
}

export async function POST(request: NextRequest) {
  // For build-time requests, return a dummy response
  if (isBuildTime()) {
    return NextResponse.json({ message: 'Build-time dummy response' });
  }

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

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];
    if (activeSubscription) {
      const activePlan = activeSubscription.plan;
      const isDowngrade = isDowngradePlan(activePlan.plan_name, plan.plan_name);

      if (activePlan.plan_id === planId) {
        return NextResponse.json({ message: "You are already subscribed to this plan" }, { status: 200 });
      }

      if (isDowngrade) {
        // For downgrades, schedule at period end
        const stripe = await loadStripe();
        if (!stripe) {
          return NextResponse.json({ error: "Failed to initialize payment processor" }, { status: 500 });
        }

        const { subscriptionId } = getStripeInfo(activeSubscription.stripe_info);

        if (!subscriptionId) {
          return NextResponse.json({ error: "Stripe subscription ID missing" }, { status: 500 });
        }

        // Get current subscription to find current period end
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Mark the current subscription as pending downgrade
        await prisma.subscription.update({
          where: { subscription_id: activeSubscription.subscription_id },
          data: {
            status: "Pending Downgrade",
            stripe_info: `Downgrade Pending|${getStripeInfo(activeSubscription.stripe_info).customerId || ''}|${subscriptionId}|${planId}`
          }
        });

        // If downgrading to free plan, cancel at period end
        if (plan.plan_name.toLowerCase() === "free") {
          await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
          });
        }

        const effectiveDate = new Date(stripeSubscription.current_period_end * 1000);

        sendSubscriptionUpdate(user.id, {
          type: 'update',
          subscription: {
            status: "Pending Downgrade",
            plan: plan.plan_name,
            effectiveDate
          }
        });

        return NextResponse.json({
          status: "Pending Downgrade",
          effectiveDate: stripeSubscription.current_period_end
        });
      } else {
        // For upgrades, process immediately
        const stripe = await loadStripe();
        if (!stripe) {
          return NextResponse.json({ error: "Failed to initialize payment processor" }, { status: 500 });
        }

        // Get price ID for the new plan
        const newPriceId = await getStripePriceId(plan.plan_name);
        if (!newPriceId) {
          return NextResponse.json({ error: "Failed to get price for new plan" }, { status: 500 });
        }

        const { subscriptionId } = getStripeInfo(activeSubscription.stripe_info);

        if (subscriptionId) {
          // Update the subscription
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          await stripe.subscriptions.update(subscriptionId, {
            items: [{
              id: stripeSubscription.items.data[0].id,
              price: newPriceId,
            }],
            proration_behavior: 'create_prorations',
          });

          // Update the subscription in the database
          await prisma.subscription.update({
            where: { subscription_id: activeSubscription.subscription_id },
            data: {
              plan_id: planId,
              status: "Active",
              stripe_info: `Active|${getStripeInfo(activeSubscription.stripe_info).customerId || ''}|${subscriptionId}`
            }
          });

          sendSubscriptionUpdate(user.id, {
            type: 'update',
            subscription: {
              status: "Active",
              plan: plan.plan_name,
              effectiveDate: new Date()
            }
          });

          return NextResponse.json({ status: "Upgraded" });
        } else {
          return NextResponse.json({ error: "Stripe subscription ID missing" }, { status: 500 });
        }
      }
    } else {
      // No active subscription, handle as new subscription
      // For free plan, just create in DB
      if (plan.plan_name.toLowerCase() === "free") {
        // Create free subscription
        await prisma.subscription.create({
          data: {
            user_id: user.id,
            plan_id: planId,
            status: "Active",
            start_date: new Date(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 100)), // Far future date
            payment_status: "Paid",
            stripe_payment_id: "free_tier", // Using placeholder for free tier
            stripe_info: "Free Tier"
          }
        });

        sendSubscriptionUpdate(user.id, {
          type: 'update',
          subscription: {
            status: "Active",
            plan: plan.plan_name,
            effectiveDate: new Date()
          }
        });

        return NextResponse.json({ status: "Subscribed" });
      } else {
        // For paid plans, redirect to checkout session
        return NextResponse.json({
          redirect: 'checkout',
          planId: planId
        });
      }
    }
  } catch (error) {
    console.error("Error in subscription process:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "An unknown error occurred"
    }, { status: 500 });
  }
}

function isDowngradePlan(currentPlan: string, newPlan: string): boolean {
  const planOrder = ["Free", "Starter", "Pro"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const newIndex = planOrder.indexOf(newPlan);

  return newIndex < currentIndex;
}

