import dynamic from 'next/dynamic';

// Import the client component dynamically with SSR disabled
const AuthErrorContent = dynamic(() => import('./AuthErrorContent'), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <div className="rounded-lg bg-white p-8 shadow-md">
                <h1 className="text-center text-2xl font-bold">Loading...</h1>
            </div>
        </div>
    )
});

export default function AuthErrorPage() {
    return <AuthErrorContent />;
} 