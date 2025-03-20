import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";
import { getServerSession } from "@/lib/auth";
import stripe from "@/utils/subscriptions/stripe";
import { sendSubscriptionUpdate } from "@/utils/sse";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if Stripe is initialized
        if (!stripe) {
            throw new Error('Stripe is not initialized');
        }

        // Find user and their active subscriptions
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                subscriptions: {
                    where: {
                        OR: [{ status: "Active" }, { status: "Pending Downgrade" }]
                    },
                    include: { plan: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Process in transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Cancel all active Stripe subscriptions
            for (const sub of user.subscriptions) {
                if (sub.stripe_payment_id && sub.stripe_payment_id !== "free_tier") {
                    try {
                        await stripe!.subscriptions.cancel(sub.stripe_payment_id);
                        console.log('✅ Canceled Stripe subscription:', sub.stripe_payment_id);
                    } catch (error) {
                        console.error('❌ Failed to cancel Stripe subscription:', error);
                    }
                }

                // Create credit transaction for the cancellation
                await tx.creditTransaction.create({
                    data: {
                        user_id: user.id,
                        subscription_id: sub.subscription_id,
                        credits_deducted: sub.plan.credits_per_month,
                        credits_added: "0",
                        payment_method: "System",
                        description: "Credits removed due to subscription cancellation"
                    }
                });
            }

            // Mark all subscriptions as canceled - don't change payment_status
            await tx.subscription.updateMany({
                where: {
                    user_id: user.id,
                    status: { in: ["Active", "Pending Downgrade"] }
                },
                data: {
                    status: "Canceled",
                    end_date: new Date()
                }
            });

            // Reset user's credits
            await tx.user.update({
                where: { id: user.id },
                data: { credits_remaining: "0" }
            });
        });

        // Notify client about the cancellation
        await sendSubscriptionUpdate(user.id, {
            type: "subscription_updated",
            details: {
                planName: "Free",
                planId: null,
                isDowngradePending: false,
                creditsRemaining: "0",
                renewalDate: null
            }
        });

        return NextResponse.json({
            success: true,
            message: "All subscriptions successfully canceled"
        });
    } catch (error) {
        console.error("❌ Cancel subscription error:", error);
        return NextResponse.json(
            { error: "Failed to cancel subscription" },
            { status: 500 }
        );
    }
}
