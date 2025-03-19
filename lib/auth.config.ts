import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from '@/lib/prismaClient';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AdapterUser } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Use direct Prisma query instead of API route to avoid routing conflicts
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            credits_remaining: user.credits_remaining || "0"
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === 'google') {
          if (!user.email) {
            throw new Error('User email is required');
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name ?? '', // Handle null/undefined safely
                password: '', // No password for Google users
                credits_remaining: '50', // Default starting credits
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
            user.id = newUser.id;
          } else {
            user.id = existingUser.id;
          }
        }
        return true; // Allow sign-in to proceed
      } catch (error) {
        console.error('SignIn error:', error);
        return false;
      }
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            email: true,
            name: true,
            credits_remaining: true
          }
        });

        if (user) {
          session.user.id = user.id.toString();
          session.user.name = user.name ?? undefined;
          // @ts-ignore - Add credits to session
          session.user.credits_remaining = user.credits_remaining;
        }

        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        // Still return the session, but log the error
        return session;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id.toString();
        // Store credits in the token for quick access
        // @ts-ignore
        token.credits_remaining = user.credits_remaining;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Default to baseUrl if url is not provided
      if (!url || url.startsWith(baseUrl)) {
        return baseUrl + '/';
      }
      // If it's an absolute URL and starts with the base URL, allow it
      if (url.startsWith('http') && url.startsWith(baseUrl)) {
        return url;
      }
      // For relative URLs
      return baseUrl + url;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
};
