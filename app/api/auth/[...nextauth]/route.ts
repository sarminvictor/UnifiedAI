import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prismaClient";
import { SubscriptionService } from '@/services/subscriptions/subscription.service';

const subscriptionService = new SubscriptionService();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Add any additional user data you want in the session
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { credits_remaining: true }
        });
        if (dbUser) {
          session.user.credits_remaining = dbUser.credits_remaining;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          return false;
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If new user, create account with initial credits
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || '',
              credits_remaining: '50', // Start with 50 credits
              image: user.image || '',
            },
          });

          // Create free subscription for new user
          await subscriptionService.createFreeSubscription(user.id);
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
