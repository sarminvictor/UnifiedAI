import { SessionProvider } from "next-auth/react";
import { useAuth } from '@/hooks/useAuth';
import { MainContent } from '@/components/MainContent';

const HomeContent = () => {
  useAuth();
  return <MainContent />;
};

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  );
}
