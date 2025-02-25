import NextAuth, { AuthOptions, SessionStrategy } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prismaClient'; // Use absolute import
import bcrypt from 'bcryptjs';
import { SubscriptionService } from '@/services/subscriptions/subscription.service';

const subscriptionService = new SubscriptionService();

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },     // Changed from username to email
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing credentials:', credentials);
            throw new Error('Missing credentials');
          }

          const user = await prisma.user.findFirst({
            where: {
              email: {
                equals: credentials.email.toLowerCase(),
                mode: 'insensitive'
              }
            }
          });

          if (!user || !user.password) {
            console.log('User not found or missing password:', credentials.email);
            throw new Error('Invalid email or password');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log('Invalid password for user:', credentials.email);
            throw new Error('Invalid email or password');
          }

          console.log('Login successful for:', credentials.email);
          return { id: user.id, email: user.email };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
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
      if (account?.provider === 'google') {
        if (!user.email) {
          throw new Error('User email is required');
        }

        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          // If new user, create account and subscription
          if (!existingUser) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || '',
                password: '',
                credits_remaining: '0',
              },
            });

            // Create free subscription for new user
            await subscriptionService.createFreeSubscription(newUser.id);
          }
          return true;
        } catch (error) {
          console.error('Error in Google sign-in:', error);
          return false;
        }
      }
      return true;
    },
  },
  debug: true, // Enable debug messages
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
