import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";
import stripe, { getStripePriceId, FALLBACK_PRICE_ID_FOR_TESTING } from "@/utils/subscriptions/stripe";
import { ensureUserExists } from "@/utils/userHelpers";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("Starting checkout session creation...");
  const session = await getServerSession();
  if (!session) {
    console.log("Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await request.json();
  const userId = session.user.id;
  const email = session.user.email;
  const name = session.user.name;

  console.log("User ID:", userId);
  console.log("Plan ID:", planId);

  try {
    const plan = await prisma.plan.findUnique({ where: { plan_id: planId } });
    if (!plan) {
      console.log("Plan not found");
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    console.log(`Creating checkout session for plan: ${plan.plan_name}`);

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Ensure the user exists in the database
    const user = await ensureUserExists(userId, email);

    if (!user) {
      return NextResponse.json({ error: "Failed to create or retrieve user" }, { status: 500 });
    }

    // Create and return the checkout session
    const checkoutSession = await createCheckoutSession(
      planId,
      userId,
      email,
      plan
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to create checkout session"
    }, { status: 500 });
  }
}

// Helper function to create the checkout session
async function createCheckoutSession(planId: string, userId: string, email: string, plan: any) {
  // Get Stripe price for this plan
  let priceId = await getStripePriceId(plan.plan_name);

  if (!priceId) {
    console.warn(`No price found for plan: ${plan.plan_name}. Using fallback price ID for testing.`);

    // For development/testing purposes only:
    if (process.env.NODE_ENV !== 'production') {
      priceId = FALLBACK_PRICE_ID_FOR_TESTING;
    } else {
      throw new Error(`No price found for plan: ${plan.plan_name}`);
    }
  }

  console.log(`Using price ID: ${priceId} for plan: ${plan.plan_name}`);

  // Ensure stripe is initialized
  if (!stripe) {
    throw new Error('Stripe client is not initialized');
  }

  // Create a new Stripe Checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment-failed?planId=${planId}`,
    customer_email: email,
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        planId: planId,
        userId: userId
      }
    },
    metadata: {
      planId: planId,
      userId: userId
    }
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create Stripe checkout URL");
  }

  // Create a pending subscription in the database
  await prisma.subscription.create({
    data: {
      user_id: userId,
      plan_id: planId,
      status: "Pending",
      start_date: new Date(),
      end_date: new Date(), // Will be updated on successful payment
      payment_status: "Pending",
      stripe_payment_id: checkoutSession.id // Use a single field for Stripe ID
    }
  });

  return checkoutSession;
}
