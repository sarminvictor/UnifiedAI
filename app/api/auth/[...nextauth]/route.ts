import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prismaClient";
import { SubscriptionService } from '@/services/subscriptions/subscription.service';
import { APIError } from '@/lib/api-helpers';
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { User } from "next-auth";
import { SessionStrategy } from "next-auth";

const subscriptionService = new SubscriptionService();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user, token }: { session: Session; user?: User; token?: JWT }) {
      try {
        if (session.user) {
          // If using JWT strategy, get the id from token
          if (token?.sub) {
            session.user.id = token.sub;
          }
          // If using database strategy, get the id from user
          else if (user?.id) {
            session.user.id = user.id;
          }

          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
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
    async signIn({ user, account, profile }: { user: User; account: any; profile?: any }) {
      try {
        if (!user.email) {
          throw new APIError(400, 'Email is required');
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || '',
              credits_remaining: '50',
            },
          });

          await subscriptionService.createFreeSubscription(newUser.id);
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
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: any }) {
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
    strategy: 'jwt' as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
