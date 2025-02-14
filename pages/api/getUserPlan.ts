import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Fetch active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: session.user.id,
        status: 'Active',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(200).json({ success: true, plan: null });
    }

    return res.status(200).json({ success: true, plan: subscription.plan.plan_name });
  } catch (error) {
    console.error('❌ Error fetching user plan:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
