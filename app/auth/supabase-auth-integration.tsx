'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/utils/supabase/client';
import { Session as SupabaseSession } from '@supabase/supabase-js';

/**
 * This component helps bridge the authentication between NextAuth and Supabase.
 * It should be included in the root layout to synchronize auth state.
 */
export default function SupabaseAuthIntegration() {
    const { data: session, status } = useSession();
    const [supabaseSession, setSupabaseSession] = useState<SupabaseSession | null>(null);

    const supabase = createClient();

    // Effect to listen for Supabase auth changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSupabaseSession(session);
            }
        );

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSupabaseSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Effect to sync NextAuth session to Supabase (when logged in via NextAuth)
    useEffect(() => {
        if (status === 'authenticated' && session && !supabaseSession) {
            // Create a custom access token for Supabase (in a real implementation, 
            // you would use a proper JWT with the right claims for Supabase)
            const syncWithSupabase = async () => {
                try {
                    // Note: This is just a placeholder. In a real implementation,
                    // you would need to create a proper JWT with Supabase compatible claims
                    // and sign it with a JWT secret, then exchange it in a custom API route
                    console.log('NextAuth session active, could sync with Supabase here');
                } catch (error) {
                    console.error('Error syncing sessions:', error);
                }
            };

            syncWithSupabase();
        }
    }, [session, supabaseSession, status]);

    // This component doesn't render anything visible
    return null;
} 