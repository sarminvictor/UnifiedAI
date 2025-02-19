import { useEffect } from 'react';
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { logger } from '@/utils/logger';

export const useAuth = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (status === "unauthenticated") {
      logger.info('User not authenticated, redirecting to login');
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/signin");
    } catch (error) {
      logger.error('Sign out error:', error);
    }
  };

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    handleSignOut
  };
};
