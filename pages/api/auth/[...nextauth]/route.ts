import NextAuth, { AuthOptions } from 'next-auth';
// ...existing imports...

export const authOptions: AuthOptions = {
  // ...existing code...
  callbacks: {
    // ...existing callbacks...
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  // ...existing code...
};

// ...existing exports...
