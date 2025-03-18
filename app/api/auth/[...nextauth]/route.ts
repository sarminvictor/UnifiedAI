import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prismaClient";
import { SubscriptionService } from '@/services/subscriptions/subscription.service';
import { APIError } from '@/lib/api-helpers';

const subscriptionService = new SubscriptionService();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      try {
        if (session.user) {
          session.user.id = user.id;
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { credits_remaining: true }
          });
          if (dbUser) {
            session.user.credits_remaining = dbUser.credits_remaining;
          }
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        throw new APIError(500, 'Failed to get user session');
      }
    },
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          throw new APIError(400, 'Email is required');
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || '',
              credits_remaining: '50',
            },
          });

          await subscriptionService.createFreeSubscription(user.id);
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        if (error instanceof APIError) {
          throw error;
        }
        throw new APIError(500, 'Failed to sign in');
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
