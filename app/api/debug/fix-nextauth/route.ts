import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prismaClient';
import { authOptions } from '@/lib/auth.config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const results = {
        timestamp: new Date().toISOString(),
        diagnostics: {
            adapter: null as any,
            config: null as any,
            schema: null as any,
            fixes_applied: [] as string[],
        },
        error: null as string | null,
    };

    try {
        // 1. Check if PrismaAdapter is properly configured
        try {
            const adapter = PrismaAdapter(prisma);
            results.diagnostics.adapter = {
                success: !!adapter,
                methods: Object.keys(adapter).filter(key => typeof adapter[key as keyof typeof adapter] === 'function'),
            };
        } catch (error: any) {
            results.diagnostics.adapter = {
                success: false,
                error: error.message
            };
        }

        // 2. Check the auth configuration
        try {
            const requiredProperties = ['adapter', 'providers', 'callbacks', 'secret'];
            const configCheck = {
                present: requiredProperties.filter(prop => authOptions && prop in authOptions),
                missing: requiredProperties.filter(prop => !authOptions || !(prop in authOptions)),
            };

            results.diagnostics.config = {
                success: configCheck.missing.length === 0,
                config: configCheck,
            };

            // Check for specific config issues
            if (authOptions) {
                // Check secret
                if (!authOptions.secret && !process.env.NEXTAUTH_SECRET) {
                    results.diagnostics.fixes_applied.push('Missing NEXTAUTH_SECRET in environment');
                }

                // Check session strategy
                if (!authOptions.session?.strategy) {
                    results.diagnostics.fixes_applied.push('Session strategy not specified');
                }
            }
        } catch (error: any) {
            results.diagnostics.config = {
                success: false,
                error: error.message
            };
        }

        // 3. Check database schema for NextAuth tables
        try {
            const requiredTables = ['User', 'Account', 'Session', 'VerificationToken'];
            const availableTables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;

            const tableNames = Array.isArray(availableTables)
                ? availableTables.map((t: any) => t.table_name)
                : [];

            const missingTables = requiredTables.filter(
                table => !tableNames.includes(table)
            );

            results.diagnostics.schema = {
                success: missingTables.length === 0,
                available: tableNames,
                missing: missingTables,
            };

            // Recommend schema fixes if needed
            if (missingTables.length > 0) {
                results.diagnostics.fixes_applied.push(
                    `Missing tables: ${missingTables.join(', ')}. Run 'npx prisma migrate dev' to create them.`
                );
            }
        } catch (error: any) {
            results.diagnostics.schema = {
                success: false,
                error: error.message
            };
        }

        // Apply fixes if requested via query param
        const url = new URL('http://localhost');  // Dummy URL for parsing

        if (url.searchParams.get('apply_fixes') === 'true') {
            // Could add code here to actually apply fixes
            // For safety, we're not implementing automatic fixes
            results.diagnostics.fixes_applied.push(
                'Automatic fixes not implemented for safety. Please apply recommendations manually.'
            );
        }

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 500 });
    }
} 