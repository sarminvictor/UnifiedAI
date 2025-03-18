import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authPrisma from "@/lib/auth-prisma"; // Use dedicated auth prisma client
import type { NextAuthOptions } from "next-auth";

// Log database connection info
console.log('NextAuth route loaded, database URL type:',
  process.env.DATABASE_URL?.includes('pooler') ? 'Pooler URL' : 'Direct URL');

// Simple auth configuration to avoid errors
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt" as const, // Type assertion to ensure proper type
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    // Add some basic callbacks to avoid errors
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  debug: true,
  logger: {
    error(code, metadata) {
      console.error(`[next-auth][error][${code}]`, metadata);
    },
    warn(code) {
      console.warn(`[next-auth][warn][${code}]`);
    },
    debug(code, metadata) {
      console.log(`[next-auth][debug][${code}]`, metadata);
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
