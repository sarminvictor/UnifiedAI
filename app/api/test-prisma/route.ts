import { NextResponse } from "next/server";
import prisma from "@/lib/prismaClient";

export async function GET() {
    try {
        console.log("[TEST-PRISMA] Starting test...");

        // Check if prisma is initialized
        if (!prisma) {
            console.error("[TEST-PRISMA] Prisma client is not initialized!");
            return NextResponse.json(
                { error: "Prisma client is not initialized" },
                { status: 500 }
            );
        }

        console.log("[TEST-PRISMA] Prisma client exists:", !!prisma);
        console.log("[TEST-PRISMA] Prisma user model exists:", !!prisma.user);

        // Try to execute a simple query
        const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
        console.log("[TEST-PRISMA] Raw query result:", testQuery);

        // Try to query users table
        const testUser = await prisma.user.findFirst();
        console.log("[TEST-PRISMA] User query success:", !!testUser);

        return NextResponse.json({
            success: true,
            diagnostics: {
                clientInitialized: !!prisma,
                userModelExists: !!prisma.user,
                rawQueryWorked: !!testQuery,
                userQueryWorked: !!testUser,
                databaseUrl: process.env.DATABASE_URL
                    ? process.env.DATABASE_URL.substring(0, 20) + "..."
                    : "undefined",
                isPoolerUrl: process.env.DATABASE_URL?.includes("pooler"),
            },
            user: testUser ? { id: testUser.id, email: testUser.email } : null
        });
    } catch (error) {
        console.error("[TEST-PRISMA] Error:", error);

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