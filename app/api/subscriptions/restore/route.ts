import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";
import stripe from "@/utils/stripe";
import { sendSubscriptionUpdate } from "@/utils/sse";


export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                subscriptions: {
                    where: { status: "Pending Downgrade" },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    include: { plan: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const currentSubscription = user.subscriptions[0];
        if (!currentSubscription) {
            return NextResponse.json({ error: "No subscription to restore" }, { status: 404 });
        }

        let updatedSubscription;

        await prisma.$transaction(async (tx) => {
            // Update subscription status - don't change payment_status
            updatedSubscription = await tx.subscription.update({
                where: { subscription_id: currentSubscription.subscription_id },
                data: {
                    status: "Active"
                    // Removed payment_status update
                },
                include: { plan: true }
            });

            if (currentSubscription.stripe_payment_id &&
                currentSubscription.stripe_payment_id !== 'free_tier') {
                try {
                    await stripe.subscriptions.update(
                        currentSubscription.stripe_payment_id,
                        { cancel_at_period_end: false }
                    );
                } catch (stripeError) {
                    console.error("Stripe restore error:", stripeError);
                    throw new Error("Failed to restore Stripe subscription");
                }
            }

            // Send real-time update
            await sendSubscriptionUpdate(user.id, {
                type: "subscription_updated",
                details: {
                    planName: currentSubscription.plan.plan_name,
                    planId: currentSubscription.plan_id,
                    isDowngradePending: false,
                    renewalDate: currentSubscription.end_date,
                    creditsRemaining: user.credits_remaining
                }
            });
        });

        return NextResponse.json({
            success: true,
            subscription: updatedSubscription,
            message: `Auto-renewal restored for ${updatedSubscription.plan.plan_name} plan`
        });
    } catch (error) {
        console.error("❌ Restore subscription error:", error);
        return NextResponse.json(
            { error: "Failed to restore subscription" },
            { status: 500 }
        );
    }
}
