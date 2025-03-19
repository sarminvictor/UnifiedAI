import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
    try {
        // Read the migration SQL file
        const migrationFilePath = path.join(process.cwd(), 'prisma/migrations/add_nextauth_tables/migration.sql');
        const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8');

        // Split SQL into statements and execute each one
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        const results = [];

        for (const stmt of statements) {
            try {
                // Execute the SQL statement
                await prisma.$executeRawUnsafe(`${stmt};`);
                results.push({
                    sql: stmt.substring(0, 50) + '...', // Only show the first 50 chars for security
                    status: 'success'
                });
            } catch (error: any) {
                // If the statement fails, log it but continue with the next one
                console.error(`Error executing SQL: ${stmt}`, error);
                results.push({
                    sql: stmt.substring(0, 50) + '...',
                    status: 'error',
                    error: error.message
                });
            }
        }

        // Record that the migration was executed
        await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        "id", 
        "checksum", 
        "finished_at", 
        "migration_name", 
        "logs", 
        "rolled_back_at", 
        "started_at", 
        "applied_steps_count"
      )
      VALUES (
        gen_random_uuid(), 
        'manual_nextauth_tables', 
        NOW(), 
        'add_nextauth_tables', 
        'Applied via debug interface', 
        NULL, 
        NOW(), 
        1
      )
      ON CONFLICT DO NOTHING;
    `;

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            message: 'Migration completed',
            results
        });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 500 });
    }
} 