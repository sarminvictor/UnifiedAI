import { PrismaClient } from "@prisma/client";

// Ensure global typing (for development mode)
declare global {
    var prisma: PrismaClient | undefined;
}

// Verify DATABASE_URL exists
if (!process.env.DATABASE_URL) {
    console.error("[PRISMA] CRITICAL ERROR: Missing DATABASE_URL environment variable.");
    throw new Error("Missing DATABASE_URL environment variable.");
}

// Use Supabase's connection pooler (port 6543 for pooler)
const poolerUrl =
    process.env.DATABASE_URL.includes("pooler.supabase.com:6543")
        ? process.env.DATABASE_URL
        : process.env.DATABASE_URL.replace(
            "db.woauvmkdxdibfontjvdi.supabase.co:5432",
            "aws-0-us-east-1.pooler.supabase.com:6543"
        ).replace(
            "postgres:",
            "postgres.woauvmkdxdibfontjvdi:"
        );

// More detailed logging of the URL (with password redacted)
const redactedUrl = (url: string) => {
    try {
        // Try to redact password from URL for logging
        const urlObj = new URL(url);
        const userParts = urlObj.username.split('.');
        urlObj.password = '***REDACTED***';
        return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.host}${urlObj.pathname}`;
    } catch (e) {
        return 'Invalid URL format';
    }
};

console.log("[PRISMA] Using connection URL:", redactedUrl(poolerUrl || process.env.DATABASE_URL));

// Create Prisma Client with explicit config
function createPrismaClient() {
    console.log("[PRISMA] Creating new PrismaClient instance");

    try {
        const client = new PrismaClient({
            datasources: {
                db: {
                    url: poolerUrl || process.env.DATABASE_URL,
                },
            },
            log: process.env.NODE_ENV === "production"
                ? ["error", "warn"] // Reduced logging in production
                : ["query", "info", "warn", "error"], // Full logging in development
        });

        console.log("[PRISMA] PrismaClient created successfully");
        return client;
    } catch (e) {
        console.error("[PRISMA] Error creating PrismaClient:", e);
        throw e; // Re-throw to fail fast
    }
}

// Singleton Prisma Client instance (with verification)
let prisma: PrismaClient;

// Get existing instance or create new one
if (process.env.NODE_ENV === "production") {
    console.log("[PRISMA] Production environment - creating new instance");
    prisma = createPrismaClient();
} else {
    // In development, use cached instance to prevent multiple clients during hot reload
    if (!global.prisma) {
        console.log("[PRISMA] Development environment - creating new instance");
        global.prisma = createPrismaClient();
    } else {
        console.log("[PRISMA] Development environment - reusing existing instance");
    }
    prisma = global.prisma;
}

// Verify the client has the expected methods
if (!prisma || !prisma.user || typeof prisma.user.findUnique !== 'function') {
    console.error("[PRISMA] CRITICAL ERROR: PrismaClient is invalid or missing critical methods");
    throw new Error("Invalid PrismaClient instance");
}

// Debug Prisma connection
console.log("[PRISMA] Initialized with", poolerUrl ? "Transaction Pooler URL" : "Direct DB Connection");

// Graceful shutdown for serverless environments
process.on("beforeExit", async () => {
    console.log("[PRISMA] Disconnecting...");
    await prisma.$disconnect();
});

// Test connection immediately (for debugging)
(async () => {
    try {
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log("[PRISMA] Connection test successful:", result);
    } catch (e) {
        console.error("[PRISMA] Connection test failed:", e);
    }
})().catch(e => console.error("[PRISMA] Async self-invocation failed:", e));

export default prisma;
