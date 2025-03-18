import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "../[...nextauth]/route";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Return the session as JSON
        return NextResponse.json(session || { user: null });
    } catch (error) {
        console.error("Error getting server session:", error);
        return NextResponse.json(
            { error: "Failed to get session" },
            { status: 500 }
        );
    }
} 