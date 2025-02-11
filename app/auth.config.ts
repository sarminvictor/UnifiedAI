import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prismaClient'; // Use absolute import
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
          throw new Error('Missing credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
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
      if (account && account.provider === 'google') {
        if (!user.email) {
          throw new Error('User email is required');
        }

        // Check if the user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If the user doesn't exist, create a new user
        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || '', // Google may not provide a name
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
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Fetch the user from the database to get the correct ID
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        session.user.id = user.id.toString(); // Ensure `id` exists
      }

      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: AdapterUser }) {
      if (user) {
        token.sub = user.id.toString();
      }
      return token;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Redirect to the chat page after login
      return baseUrl + '/';
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
};
