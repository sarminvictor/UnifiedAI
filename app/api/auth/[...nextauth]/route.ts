import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authPrisma from "@/lib/auth-prisma"; // Use dedicated auth prisma client
import type { NextAuthOptions } from "next-auth";

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
  debug: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
