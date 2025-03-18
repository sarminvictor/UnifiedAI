import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: {
                        domain?: string;
                        path?: string;
                        expires?: Date;
                        httpOnly?: boolean;
                        maxAge?: number;
                        secure?: boolean;
                        sameSite?: 'strict' | 'lax' | 'none';
                    }) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: {
                        domain?: string;
                        path?: string;
                    }) {
                        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
                    },
                },
            }
        );

        // Exchange the code for a session
        await supabase.auth.exchangeCodeForSession(code);
    }

    // URL to redirect to after sign in
    return NextResponse.redirect(requestUrl.origin);
} 