import dynamic from 'next/dynamic';

// Import the client component dynamically with SSR disabled
const PaymentSuccessContent = dynamic(() => import('./PaymentSuccessContent'), {
    ssr: false,
    loading: () => <div className="flex min-h-screen items-center justify-center">Loading...</div>
});

export default function PaymentSuccessPage() {
    return <PaymentSuccessContent />;
}
