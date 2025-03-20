import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MISSING_COLUMNS_MIGRATIONS = [
    // Add emailVerified column
    `ALTER TABLE "User" 
   ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3)`,

    // Add image column
    `ALTER TABLE "User" 
   ADD COLUMN IF NOT EXISTS "image" TEXT`
];

export async function POST() {
    try {
        const results = [];

        for (const stmt of MISSING_COLUMNS_MIGRATIONS) {
            try {
                // Execute the SQL statement
                await prisma.$executeRawUnsafe(`${stmt}`);
                results.push({
                    sql: stmt,
                    status: 'success'
                });
            } catch (error: any) {
                // If the statement fails, log it but continue with the next one
                console.error(`Error executing SQL:`, error);
                results.push({
                    sql: stmt,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            message: 'Successfully added missing columns',
            results
        });
    } catch (error: any) {
        console.error('Error adding columns:', error);
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 500 });
    }
} 