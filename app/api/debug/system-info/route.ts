import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import os from 'os';
import { headers } from 'next/headers';

// Only expose non-sensitive environment variables
const SAFE_ENV_VARS = [
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL',
    'NEXTAUTH_URL',
    'VERCEL_REGION',
    'VERCEL_ENV',
    'VERCEL_URL',
    'VERCEL_GIT_PROVIDER',
    'VERCEL_GIT_REPO_SLUG',
];

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const prisma = new PrismaClient();
    let dbStatus = {
        status: 'error' as const,
        error: 'Not connected'
    };

    // Get database status
    try {
        // Simple query to test connection
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

        dbStatus = {
            status: 'connected' as const,
            version,
            tables
        };
    } catch (error: any) {
        dbStatus = {
            status: 'error' as const,
            error: error.message
        };
    } finally {
        await prisma.$disconnect();
    }

    // Get environment variables (only safe ones)
    const envVars: Record<string, string | undefined> = {};
    SAFE_ENV_VARS.forEach(key => {
        envVars[key] = process.env[key];
    });

    // Add connection strings with masked values
    if (process.env.DATABASE_URL) {
        const url = process.env.DATABASE_URL;
        envVars['DATABASE_URL'] = `${url.substring(0, 15)}...${url.substring(url.length - 10)}`;
    }

    if (process.env.DIRECT_URL) {
        const url = process.env.DIRECT_URL;
        envVars['DIRECT_URL'] = `${url.substring(0, 15)}...${url.substring(url.length - 10)}`;
    }

    // Add presence indicators for important API keys
    envVars['OPENAI_API_KEY'] = process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]';
    envVars['ANTHROPIC_API_KEY'] = process.env.ANTHROPIC_API_KEY ? '[SET]' : '[NOT SET]';
    envVars['GOOGLE_API_KEY'] = process.env.GOOGLE_API_KEY ? '[SET]' : '[NOT SET]';
    envVars['DEEPSEEK_API_KEY'] = process.env.DEEPSEEK_API_KEY ? '[SET]' : '[NOT SET]';
    envVars['RESEND_API_KEY'] = process.env.RESEND_API_KEY ? '[SET]' : '[NOT SET]';

    // Get build info
    const buildTime = process.env.NEXT_BUILD_TIME || 'Unknown';

    // Get Vercel region if available
    const vercelRegion = process.env.VERCEL_REGION ||
        headers().get('x-vercel-id')?.split(':')[0] ||
        undefined;

    return NextResponse.json({
        nextVersion: process.versions.node || 'Unknown',
        nodeVersion: process.version || 'Unknown',
        environment: process.env.NODE_ENV || 'Unknown',
        buildTime,
        vercelRegion,
        platform: isVercel ? 'Vercel' : os.platform(),
        database: dbStatus,
        auth: {
            status: 'loading'
        },
        environment_variables: envVars,
        apis: {
            auth: { status: 'loading' },
            webhook: { status: 'loading' },
            reset_password: { status: 'loading' },
        }
    });
} 