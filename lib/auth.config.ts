import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from '@/lib/prismaClient';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AdapterUser } from 'next-auth/adapters';

// Custom logger for auth errors
const authLogger = {
  error: (code: string, metadata: any) => {
    console.error(`NextAuth Error [${code}]:`, metadata);
  },
  warn: (code: string, metadata: any) => {
    console.warn(`NextAuth Warning [${code}]:`, metadata);
  },
  debug: (code: string, metadata: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`NextAuth Debug [${code}]:`, metadata);
    }
  }
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // Find user by email (case insensitive)
          const user = await prisma.user.findFirst({
            where: {
              email: {
                equals: credentials.email.toLowerCase(),
                mode: 'insensitive'
              }
            }
          });

          if (!user || !user.password) {
            throw new Error('Invalid email or password');
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            throw new Error('Invalid email or password');
          }

          // Return a standardized user object
          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            image: user.image || null,
            credits_remaining: user.credits_remaining || "0",
          };
        } catch (error) {
          authLogger.error('authorize', { error });
          throw error instanceof Error ? error : new Error('Authentication failed');
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true, // Allow linking google accounts with existing email
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google') {
          if (!user.email) {
            throw new Error('User email is required');
          }

          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Create new user for Google auth
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name ?? '',
                image: user.image ?? '',
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
        authLogger.error('signIn', { error });
        return false;
      }
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      try {
        // If we have a user ID in the token, look up fresh user data
        if (token.sub) {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              email: true,
              name: true,
              credits_remaining: true,
              image: true
            }
          });

          if (user) {
            session.user = {
              ...session.user,
              id: user.id,
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              // @ts-ignore - Add credits to session
              credits_remaining: user.credits_remaining
            };
          }
        }
        return session;
      } catch (error) {
        authLogger.error('session', { error });
        return session; // Return session even if there's an error
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // Store any custom user data in the token
        token.name = user.name || null;
        token.email = user.email || null;
        token.picture = user.image || null;
        // @ts-ignore
        token.credits_remaining = user.credits_remaining;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Debug logging for redirect URLs
      authLogger.debug('redirect', { url, baseUrl });

      // If no URL provided, go to chat page
      if (!url || url === '') {
        return `${baseUrl}/c`;
      }

      // Handle callback URLs to specific pages
      if (url.startsWith('/auth/signin') || url === '/') {
        return `${baseUrl}/c`;
      }

      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Allow redirects to the same site
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default fallback to chat page
      return `${baseUrl}/c`;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error', // Add a dedicated error page
  },
  debug: process.env.NODE_ENV === 'development',
  logger: authLogger,
  secret: process.env.NEXTAUTH_SECRET,
};
