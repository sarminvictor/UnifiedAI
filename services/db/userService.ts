import prisma from '@/lib/prismaClient';
import { Decimal } from '@prisma/client/runtime/library';
import { SubscriptionService } from '@/services/subscriptions/subscription.service';

interface UserCredits {
  id: string;
  credits_remaining: string;
}

const subscriptionService = new SubscriptionService();

export class UserService {
  static async createUser(email: string, hashedPassword: string, name?: string) {
    try {
      // Create user with 0 initial credits
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          credits_remaining: '0',
        },
      });

      // Create free subscription which will add credits
      await subscriptionService.createFreeSubscription(user.id);

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findUser(userId: string): Promise<UserCredits | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        credits_remaining: true 
      }
    });
  }

  static async findUserByEmail(email: string): Promise<UserCredits | null> {
    return prisma.user.findUnique({
      where: { email },
      select: { 
        id: true,
        credits_remaining: true 
      }
    });
  }

  static async updateUserCredits(userId: string, newCredits: string): Promise<UserCredits> {
    if (!userId) {
      throw new Error('User ID is required for updating credits');
    }
    
    return prisma.user.update({
      where: { id: userId },
      data: { credits_remaining: newCredits },
      select: { 
        id: true,
        credits_remaining: true 
      }
    });
  }

  static validateCredits(currentCredits: Decimal, requiredCredits: Decimal): boolean {
    return !currentCredits.equals(0) && currentCredits.greaterThanOrEqualTo(requiredCredits);
  }

  static calculateNewCredits(currentCredits: string, creditsToDeduct: string): string {
    const currentCreditsNum = parseFloat(currentCredits);
    const creditsToDeductNum = parseFloat(creditsToDeduct);
    return (currentCreditsNum - creditsToDeductNum).toFixed(6);
  }
}
