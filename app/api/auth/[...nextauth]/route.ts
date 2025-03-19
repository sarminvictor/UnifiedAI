import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";

// Export handler for GET and POST requests
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Re-export authOptions for use in middleware or other places
export { authOptions };
