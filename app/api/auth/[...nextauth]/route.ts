import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";

// Use the centralized auth configuration from lib/auth.config.ts
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
