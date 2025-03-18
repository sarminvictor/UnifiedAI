import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
    try {
        console.log("[AUTH-CHECK] Checking environment variables...");

        // Check critical environment variables
        const diagnostics = {
            database_url: !!process.env.DATABASE_URL,
            nextauth_url: !!process.env.NEXTAUTH_URL,
            nextauth_secret: !!process.env.NEXTAUTH_SECRET,
            google_client_id: !!process.env.GOOGLE_CLIENT_ID,
            google_client_secret: !!process.env.GOOGLE_CLIENT_SECRET,
            database_url_type: process.env.DATABASE_URL?.includes('pooler') ? 'pooler' : 'direct',
            nextauth_url_value: process.env.NEXTAUTH_URL?.substring(0, 30) + "..." || "undefined"
        };

        console.log("[AUTH-CHECK] Environment diagnostics:", diagnostics);

        // Try to get session (will use NextAuth)
        const session = await getServerSession(authOptions);
        console.log("[AUTH-CHECK] Session check result:", !!session);

        return NextResponse.json({
            success: true,
            diagnostics,
            sessionExists: !!session,
            user: session?.user ? {
                name: session.user.name,
                email: session.user.email,
            } : null
        });
    } catch (error) {
        console.error("[AUTH-CHECK] Error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
} 