import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";

function getSubscriptionEndDate(startDate: Date): Date {
  const endDate = new Date(startDate.getTime());
  
  const currentMonth = endDate.getUTCMonth();
  const currentDay = endDate.getUTCDate();
  const currentHours = endDate.getUTCHours();
  const currentMinutes = endDate.getUTCMinutes();
  const currentSeconds = endDate.getUTCSeconds();
  const currentMilliseconds = endDate.getUTCMilliseconds();

  endDate.setUTCMonth(currentMonth + 1);
  endDate.setUTCDate(currentDay);
  endDate.setUTCHours(currentHours);
  endDate.setUTCMinutes(currentMinutes);
  endDate.setUTCSeconds(currentSeconds);
  endDate.setUTCMilliseconds(currentMilliseconds);

  return endDate;
}

export async function POST(request: NextRequest) {
  // Authentication is handled by global middleware
  const session = await getServerSession();
  const { planId } = await request.json();

  try {
    // Plan validation is handled by global middleware
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: session.user.email }
      });

      // Check for existing pending subscription
      const existingPending = await tx.subscription.findFirst({
        where: {
          user_id: user.id,
          status: "Pending"
        }
      });

      if (existingPending) {
        await tx.subscription.update({
          where: { subscription_id: existingPending.subscription_id },
          data: { 
            status: "Canceled",
            payment_status: "Canceled"
          }
        });
      }

      const startDate = new Date();
      const endDate = getSubscriptionEndDate(startDate);

      return await tx.subscription.create({
        data: {
          user_id: user.id,
          plan_id: planId,
          status: "Pending",
          start_date: startDate,
          end_date: endDate,
          payment_status: "Pending",
          stripe_payment_id: `mock_${Date.now()}_${user.id}`,
        },
      });
    });

    return NextResponse.json({ success: true, subscription: result });
  } catch (error) {
    console.error("Subscription creation error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create subscription"
    }, { status: 500 });
  }
}
