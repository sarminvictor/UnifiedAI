import { NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";  // Use your existing prisma client
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all plans
    const plans = await prisma.plan.findMany({
      orderBy: {
        price: 'asc'
      }
    });

    // Get user's current subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          where: { status: 'Active' },
          orderBy: { start_date: 'desc' },
          take: 1,
          include: {
            plan: true
          }
        }
      }
    });

    const currentPlanId = user?.subscriptions[0]?.plan_id || null;

    return NextResponse.json({
      plans,
      currentPlan: currentPlanId
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
