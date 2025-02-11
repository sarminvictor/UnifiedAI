import NextAuth, { AuthOptions, SessionStrategy } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prismaClient'; // Use absolute import
import bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Email', type: 'email' }, // Revert to email
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.username }, // Revert to email
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

        return { id: user.id, email: user.email };
      },
    }),

    // ✅ Add Google Authentication
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' as SessionStrategy },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string; // Add user ID to session
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
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
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || '', // Google may not provide a name
              password: '', // No password for Google users
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      }
      return true; // Allow sign-in to proceed
    },
  },
};

export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);
