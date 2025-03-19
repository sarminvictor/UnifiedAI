import { SessionProvider } from '../../providers/SessionProvider';
import AuthDebugClient from './client.js';

export const dynamic = 'force-dynamic';

export default function AuthDebugPage() {
    return (
        <SessionProvider>
            <AuthDebugClient />
        </SessionProvider>
    );
} 