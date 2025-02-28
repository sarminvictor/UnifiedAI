import { NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";  // Use your existing prisma client
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getStripePriceId } from "@/utils/stripe";

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

    // Fetch Stripe prices server-side
    const plansWithPrices = await Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        stripePriceId: await getStripePriceId(plan.plan_name)
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
