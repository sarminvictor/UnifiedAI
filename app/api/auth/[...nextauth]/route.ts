import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prismaClient";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

// Check if all required tables exist
async function checkTablesExist() {
  try {
    // Try a simple query to verify table structure
    console.log("[NextAuth] Checking if required tables exist...");

    // First verify if Prisma is connected
    const testConnection = await prisma.$queryRaw`SELECT 1 AS connected`;
    console.log("[NextAuth] Database connection test:", testConnection);

    // Check if User table exists
    const hasUserTable = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'User'
      );
    `;
    console.log("[NextAuth] User table exists:", hasUserTable);

    // Check if Account table exists (needed for OAuth)
    const hasAccountTable = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'Account'
      );
    `;
    console.log("[NextAuth] Account table exists:", hasAccountTable);

    return { hasUserTable, hasAccountTable };
  } catch (error) {
    console.error("[NextAuth] Error checking tables:", error);
    return { hasUserTable: false, hasAccountTable: false, error };
  }
}

// Log database URL type
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
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error("User not found");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
          };
        } catch (error) {
          console.error("[NextAuth] Authorization error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
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
  debug: process.env.NODE_ENV === 'development',
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

// Initialize table check once
checkTablesExist().catch(error => {
  console.error("[NextAuth] Table check failed:", error);
});

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
