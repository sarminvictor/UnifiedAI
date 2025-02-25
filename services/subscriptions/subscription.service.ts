import { PrismaClient } from '@prisma/client';
import { addMonths } from 'date-fns';

const prisma = new PrismaClient();

export class SubscriptionService {
  async createFreeSubscription(userId: string) {
    try {
      // Get the free plan
      const freePlan = await prisma.plan.findFirst({
        where: { plan_name: 'Free' }
      });

      if (!freePlan) {
        throw new Error('Free plan not found');
      }

      // Cancel the previous active subscription
      const previousSubscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'Active'
        },
        orderBy: {
          start_date: 'desc'
        }
      });

      let creditsDeducted = '0';
      if (previousSubscription) {
        await prisma.subscription.update({
          where: { subscription_id: previousSubscription.subscription_id },
          data: { status: 'Canceled' }
        });

        // Deduct remaining credits from the previous subscription
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (user) {
          creditsDeducted = user.credits_remaining;
        }
      }

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          user_id: userId,
          plan_id: freePlan.plan_id,
          end_date: addMonths(new Date(), 1),
          status: 'Active',
          payment_status: 'Free',
          stripe_payment_id: 'free_tier'
        }
      });

      // Update user's credits with plan credits
      await prisma.user.update({
        where: { id: userId },
        data: { credits_remaining: freePlan.credits_per_month }
      });

      // Create credit transaction record
      await prisma.creditTransaction.create({
        data: {
          user_id: userId,
          subscription_id: subscription.subscription_id,
          credits_added: freePlan.credits_per_month,
          credits_deducted: creditsDeducted,
          description: 'Initial free plan credits'
        }
      });

      return subscription;
    } catch (error) {
      console.error('Error creating free subscription:', error);
      throw error;
    }
  }

  async ensureUserHasSubscription(userId: string) {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { user_id: userId }
    });

    if (!existingSubscription) {
      return this.createFreeSubscription(userId);
    }

    return existingSubscription;
  }
}
