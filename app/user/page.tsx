import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';

export default async function UserPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/auth/signin');
    }

    // Redirect to protected user dashboard
    redirect('/(protected)/user');
} 