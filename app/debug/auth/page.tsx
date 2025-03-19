import { SessionProvider } from '../../providers/SessionProvider';
import AuthDebugClient from './client';

export const dynamic = 'force-dynamic';

export default function AuthDebugPage() {
    return (
        <SessionProvider>
            <AuthDebugClient />
        </SessionProvider>
    );
} 