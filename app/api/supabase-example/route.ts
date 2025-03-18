import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const cookieStore = cookies();

    // Initialize Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: '', ...options, maxAge: 0 });
                },
            },
        }
    );

    try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Example query to a table
        const { data, error } = await supabase
            .from('example_table')
            .select('*')
            .limit(10);

        if (error) {
            console.error('Supabase query error:', error);
            return NextResponse.json(
                { error: 'Database Error', message: error.message },
                { status: 500 }
            );
        }

        // Return successful response
        return NextResponse.json({
            success: true,
            user: session.user,
            data
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const cookieStore = cookies();

    // Initialize Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: '', ...options, maxAge: 0 });
                },
            },
        }
    );

    try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();

        // Example insert into a table
        const { data, error } = await supabase
            .from('example_table')
            .insert([
                {
                    user_id: session.user.id,
                    content: body.content,
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            return NextResponse.json(
                { error: 'Database Error', message: error.message },
                { status: 500 }
            );
        }

        // Return successful response
        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 