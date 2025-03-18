import { PrismaClient } from "@prisma/client";

// Ensure global typing (for development mode)
declare global {
    var prisma: PrismaClient | undefined;
}

// Verify DATABASE_URL exists
if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable.");
}

// Use Supabase's connection pooler (port 6543 for pooler)
const poolerUrl =
    process.env.DATABASE_URL.includes("pooler.supabase.com:6543")
        ? process.env.DATABASE_URL
        : process.env.DATABASE_URL.replace(
            "db.woauvmkdxdibfontjvdi.supabase.co:5432",
            "aws-0-us-east-1.pooler.supabase.com:6543"
        );

// Singleton Prisma Client instance
const prisma = global.prisma || new PrismaClient({
    datasources: {
        db: {
            url: poolerUrl || process.env.DATABASE_URL, // Use modified or original URL
        },
    },
    log:
        process.env.NODE_ENV === "production"
            ? ["error"] // Log only errors in production
            : ["query", "info", "warn", "error"], // Log everything in development
});

// Prevent multiple Prisma instances in development (hot reload)
if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

// Debug Prisma connection
console.log(
    "[Prisma] Initialized with",
    poolerUrl ? "Transaction Pooler URL" : "Direct DB Connection"
);

// Graceful shutdown for serverless environments
process.on("beforeExit", async () => {
    console.log("[Prisma] Disconnecting...");
    await prisma.$disconnect();
});

export default prisma;
