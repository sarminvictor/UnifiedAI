import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";
import stripe from "@/utils/subscriptions/stripe";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                subscriptions: {
                    where: {
                        OR: [
                            { status: "Active" },
                            { status: "Pending Downgrade" }
                        ]
                    },
                    include: { plan: true },
                    take: 1
                }
            }
        });

        if (!user?.subscriptions.length) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

        const subscription = user.subscriptions[0];
        const renewalDate = subscription.end_date;

        // Ensure valid date before sending
        if (!renewalDate) {
            console.error('Invalid renewal date for subscription:', subscription.subscription_id);
            return NextResponse.json({ error: "Invalid subscription date" }, { status: 500 });
        }

        // Cancel Stripe auto-renewal if pending downgrade
        if (subscription.status === "Pending Downgrade" &&
            subscription.stripe_payment_id &&
            subscription.stripe_payment_id !== 'free_tier') {
            if (!stripe) {
                throw new Error('Stripe instance not initialized');
            }
            try {
                await stripe.subscriptions.update(subscription.stripe_payment_id, {
                    cancel_at_period_end: true
                });
                console.log('✅ Disabled auto-renewal for subscription:', subscription.stripe_payment_id);
            } catch (error) {
                console.error('❌ Failed to disable auto-renewal:', error);
            }
        }

        return NextResponse.json({
            planName: subscription.plan.plan_name,
            planId: subscription.plan_id,
            renewalDate: renewalDate.toISOString(), // Ensure proper date format
            isDowngradePending: subscription.status === "Pending Downgrade",
            creditsRemaining: user.credits_remaining,
            stripeId: subscription.stripe_payment_id
        });
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
    }
}
