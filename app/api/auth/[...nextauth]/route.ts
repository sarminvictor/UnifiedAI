import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";

// Export handler for API route
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// We don't need to export authOptions directly from here anymore,
// since we're importing it from the centralized config file
