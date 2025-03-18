import dynamic from 'next/dynamic';

// Import the client component dynamically with SSR disabled
const PaymentFailedContent = dynamic(() => import('./PaymentFailedContent'), {
    ssr: false,
    loading: () => <div className="flex min-h-screen items-center justify-center">Loading...</div>
});

export default function PaymentFailedPage() {
    return <PaymentFailedContent />;
}
