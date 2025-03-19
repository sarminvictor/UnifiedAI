import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Singleton to avoid too many connections
let prismaClient: PrismaClient | null = null;

const getPrismaClient = () => {
    if (!prismaClient) {
        prismaClient = new PrismaClient({
            log: ['error']
        });
    }
    return prismaClient;
};

export async function GET() {
    const prisma = getPrismaClient();

    try {
        // Test database connection with a simple query
        const result = await prisma.$queryRaw`SELECT version()`;
        const version = result && Array.isArray(result) && result.length > 0
            ? result[0].version
            : 'Unknown';

        // Get list of tables
        const tableInfo = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

        const tables = Array.isArray(tableInfo)
            ? tableInfo.map((t: any) => t.table_name)
            : [];

        // Count records in each table
        const tableCounts = [];
        for (const table of tables) {
            try {
                const countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "${table}"
        `;
                tableCounts.push({
                    table,
                    count: countResult[0].count
                });
            } catch (err) {
                tableCounts.push({
                    table,
                    count: 'Error counting'
                });
            }
        }

        // Check direct connection
        let directConnectionStatus = "Not tested";
        if (process.env.DIRECT_URL) {
            try {
                // Just check if the URL is defined
                directConnectionStatus = "URL defined";
            } catch (error) {
                directConnectionStatus = "Error: " + (error as Error).message;
            }
        } else {
            directConnectionStatus = "No DIRECT_URL defined";
        }

        // Check pooled connection
        let pooledConnectionStatus = "Not tested";
        if (process.env.DATABASE_URL) {
            try {
                // Just check if the URL is defined
                pooledConnectionStatus = "URL defined";
            } catch (error) {
                pooledConnectionStatus = "Error: " + (error as Error).message;
            }
        } else {
            pooledConnectionStatus = "No DATABASE_URL defined";
        }

        return NextResponse.json({
            status: 'connected',
            version,
            tables,
            tableCounts,
            connections: {
                direct: directConnectionStatus,
                pooled: pooledConnectionStatus
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
} 