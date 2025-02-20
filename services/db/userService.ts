import prisma from '@/lib/prismaClient';
import { Decimal } from '@prisma/client/runtime/library';

interface UserCredits {
  credits_remaining: string;
}

export class UserService {
  static async findUser(userId: string): Promise<UserCredits | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { credits_remaining: true }
    });
  }

  static async updateUserCredits(userId: string, newCredits: string): Promise<UserCredits> {
    return prisma.user.update({
      where: { id: userId },
      data: { credits_remaining: newCredits },
      select: { credits_remaining: true }
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
