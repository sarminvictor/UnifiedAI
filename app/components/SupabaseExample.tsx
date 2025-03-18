'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';

export default function SupabaseExample() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        async function getSession() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);

                // Listen for auth changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    (_event, session) => {
                        setSession(session);
                    }
                );

                // Example data fetch from a table
                if (session) {
                    const { data, error } = await supabase
                        .from('example_table')
                        .select('*')
                        .limit(10);

                    if (error) throw error;
                    if (data) setData(data);
                }

                return () => {
                    subscription.unsubscribe();
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                setLoading(false);
            }
        }

        getSession();
    }, [supabase]);

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold">Supabase Example</h2>

            {session ? (
                <div>
                    <p className="mb-2">Logged in as: {session.user.email}</p>
                    <button
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => supabase.auth.signOut()}
                    >
                        Sign Out
                    </button>

                    <div className="mt-4">
                        <h3 className="text-xl font-semibold">Data from Supabase:</h3>
                        {data.length > 0 ? (
                            <ul className="list-disc pl-5 mt-2">
                                {data.map((item, index) => (
                                    <li key={index}>
                                        {JSON.stringify(item)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No data available.</p>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    <p className="mb-2">Not logged in</p>
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: `${window.location.origin}/auth/callback`
                            }
                        })}
                    >
                        Sign In with Google
                    </button>
                </div>
            )}
        </div>
    );
} 