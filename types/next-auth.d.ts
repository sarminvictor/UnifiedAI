import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null | undefined; // ✅ Allow `undefined` for better compatibility
      image?: string | null | undefined; // ✅ Ensure consistency with NextAuth types
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null | undefined; // ✅ Allow `undefined`
    image?: string | null | undefined; // ✅ Allow `undefined`
  }
}
