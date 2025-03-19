import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";

// Export the NextAuth handler for both GET and POST methods
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
// Re-export authOptions for easier importing in other files
export { authOptions };
