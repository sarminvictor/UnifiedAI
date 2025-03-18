import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Import the client component dynamically with SSR disabled
const StripeCheckoutContent = dynamic(() => import('./StripeCheckoutContent'), {
    ssr: false,
    loading: () => <div className="flex min-h-screen items-center justify-center">Loading payment interface...</div>
});

export default function StripeCheckoutPage() {
    return <StripeCheckoutContent />;
}
