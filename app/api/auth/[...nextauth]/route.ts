import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prismaClient"; // Use regular prisma client instead of auth-specific one
import type { NextAuthOptions } from "next-auth";

// Added debug code to check if prisma is initialized
if (!prisma) {
  console.error("[CRITICAL ERROR] Prisma client is not initialized in NextAuth!");
} else {
  console.log("[NextAuth] Prisma client is initialized:", !!prisma);
  // Try to access a method to verify it's a real client
  console.log("[NextAuth] Prisma client has findUnique:", !!prisma.user?.findUnique);
}

// Log database connection info
console.log('[NextAuth] DATABASE_URL type:',
  process.env.DATABASE_URL?.includes('pooler') ? 'Pooler URL' : 'Direct URL');

// Simple auth configuration to avoid errors
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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

// Try to access prisma directly right before handler creation
try {
  console.log("[NextAuth] Testing prisma access:", !!prisma.user);
} catch (e) {
  console.error("[NextAuth] Error testing prisma access:", e);
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
