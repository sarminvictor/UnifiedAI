import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth.config";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Add error logging for debugging
console.log('NextAuth route handler loaded');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('Using providers:', Object.keys(authOptions.providers));

// Export the NextAuth handler for both GET and POST methods
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
// Re-export authOptions for easier importing in other files
export { authOptions };
