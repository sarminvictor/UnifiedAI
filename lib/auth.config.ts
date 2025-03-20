import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prismaClient';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { UserService } from '@/services/db/userService';

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
          const user: any = await prisma.user.findFirst({
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
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      try {
        if (account?.provider === 'google' && profile?.email) {
          // Check if user already exists
          const existingUser: any = await prisma.user.findUnique({
            where: { email: profile.email.toLowerCase() },
          });

          if (!existingUser) {
            // Create new user for Google auth with free subscription
            const hashedPassword = ''; // No password for Google users
            const newUser = await UserService.createUser(
              profile.email.toLowerCase(),
              hashedPassword,
              profile.name
            );

            // If profile has picture, update the user
            if (profile?.picture) {
              await prisma.user.update({
                where: { id: newUser.id },
                data: {
                  // Use type assertion to handle the image property
                  image: profile.picture as string
                } as any
              });
            }

            // Update the user object with our new user's ID
            user.id = newUser.id;
          } else {
            // Update the user object with the existing user's ID
            user.id = existingUser.id;

            // Optionally update the user's profile information if needed
            if ((profile.name && !existingUser.name) || (profile.picture && !existingUser.image)) {
              const updateData: any = {};

              if (profile.name && !existingUser.name) {
                updateData.name = profile.name;
              }

              if (profile.picture && !existingUser.image) {
                updateData.image = profile.picture;
              }

              if (Object.keys(updateData).length > 0) {
                await prisma.user.update({
                  where: { id: existingUser.id },
                  data: updateData
                });
              }
            }
          }
        }
        return true; // Allow sign-in to proceed
      } catch (error) {
        authLogger.error('signIn', { error, provider: account?.provider });
        return false;
      }
    },
    async session({ session, token }) {
      try {
        // If we have a user ID in the token, look up fresh user data
        if (token.sub) {
          const user: any = await prisma.user.findUnique({
            where: { id: token.sub },
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
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        // Store any custom user data in the token
        token.name = user.name || null;
        token.email = user.email || null;
        if (user.image) token.picture = user.image;
        // @ts-ignore
        token.credits_remaining = user.credits_remaining;
      }

      // On subsequent calls, update the token if we have new account info
      if (account) {
        token.provider = account.provider;
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      // Debug logging for redirect URLs
      authLogger.debug('redirect', { url, baseUrl });

      // If no URL provided, go to homepage
      if (!url || url === '') {
        return baseUrl;
      }

      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Allow redirects to the same site
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default fallback to base URL
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error', // Add a dedicated error page
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};
