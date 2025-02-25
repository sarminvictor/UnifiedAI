import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  console.log("Starting checkout session creation...");
  const session = await getServerSession();
  if (!session) {
    console.log("Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await request.json();
  const userId = session.user.id;
  console.log("User ID:", userId);
  console.log("Plan ID:", planId);

  const plan = await prisma.plan.findUnique({ where: { plan_id: planId } });
  if (!plan) {
    console.log("Plan not found");
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Mock checkout session creation
  const checkoutSessionUrl = `/stripe-checkout?planId=${planId}`;
  console.log("Checkout session URL:", checkoutSessionUrl);

  return NextResponse.json({ url: checkoutSessionUrl });
}
