import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { plan } = req.body;
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Plan is required' });
  }

  try {
    // Fetch the selected plan details
    const selectedPlan = await prisma.plan.findUnique({ where: { plan_name: plan } });
    if (!selectedPlan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    // Fetch the user's active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: { user_id: session.user.id, status: 'Active' },
    });

    if (activeSubscription) {
      // Deactivate existing subscription
      await prisma.subscription.update({
        where: { subscription_id: activeSubscription.subscription_id },
        data: { status: 'Canceled' },
      });
    }

    // Create new subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        subscription_id: uuidv4(),
        user_id: session.user.id,
        plan_id: selectedPlan.plan_id,
        start_date: new Date(),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1-month duration
        status: 'Active',
        payment_status: 'Paid',
        stripe_payment_id: 'PLACEHOLDER',
      },
    });

    // Update user credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits_remaining: selectedPlan.credits_per_month },
    });

    return res.status(200).json({ success: true, message: 'Subscription activated successfully' });
  } catch (error) {
    console.error('❌ Error processing subscription:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
