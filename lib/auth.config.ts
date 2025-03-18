import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from '@/lib/prismaClient';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions, Session, User as NextAuthUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AdapterUser } from 'next-auth/adapters';

// Ensure Prisma is initialized properly
if (!prisma) {
  console.error("Prisma client is not initialized");
}

// Use the proper way to create the adapter
const adapter = PrismaAdapter(prisma);

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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

        return { id: user.id.toString(), email: user.email };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: 'jwt',
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
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email ?? undefined },
        });

        if (user) {
          session.user.id = user.id.toString();
          session.user.name = user.name ?? undefined;
        }

        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        return session;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id.toString();
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + '/';
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error', // Add error page
  },
  debug: process.env.NODE_ENV === 'development',
};
