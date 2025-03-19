import { NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";  // Use your existing prisma client
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getStripePriceId, PLAN_TO_STRIPE_PRODUCT } from "@/utils/subscriptions/stripe";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Type guard to check if a string is a valid plan name
function isValidPlanName(name: string): name is keyof typeof PLAN_TO_STRIPE_PRODUCT {
  return name in PLAN_TO_STRIPE_PRODUCT;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('🔑 Session:', session?.user?.email);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all plans first
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' }
    });

    console.log('📦 Found plans:', plans.length);

    // Fetch Stripe prices server-side with type checking
    const plansWithPrices = await Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        stripePriceId: isValidPlanName(plan.plan_name)
          ? await getStripePriceId(plan.plan_name)
          : null
      }))
    );

    // Get user with active subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          where: {
            OR: [
              { status: 'Active' },
              { status: 'Pending Downgrade' }
            ]
          },
          orderBy: { start_date: 'desc' },
          take: 1,
          include: {
            plan: true
          }
        }
      }
    });

    const currentPlanId = user?.subscriptions[0]?.plan_id || null;
    console.log('🎯 Current plan ID:', currentPlanId);

    return NextResponse.json({
      plans: plansWithPrices,
      currentPlan: currentPlanId
    });
  } catch (error) {
    console.error('❌ Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
