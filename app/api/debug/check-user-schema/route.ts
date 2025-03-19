import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        // Check the User table schema
        const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `;

        // Check if User table has the expected NextAuth columns
        const columnNames = Array.isArray(userColumns)
            ? userColumns.map((col: any) => col.column_name)
            : [];

        // NextAuth expects these columns
        const expectedAuthColumns = ['email', 'emailVerified', 'name', 'image'];
        const missingColumns = expectedAuthColumns.filter(col => !columnNames.includes(col));

        // Check primary key naming - could be 'id' or 'user_id'
        const primaryKeyColumn = columnNames.includes('id') ? 'id' :
            columnNames.includes('user_id') ? 'user_id' : null;

        // See if the expected User <-> Account relationship can work
        let canRelateToAccount = false;

        if (primaryKeyColumn) {
            canRelateToAccount = true;
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            userTableSchema: {
                columns: userColumns,
                primaryKey: primaryKeyColumn,
                missingAuthColumns: missingColumns,
                canRelateToAccount
            },
            recommendations: [
                ...missingColumns.map(col => `Add column '${col}' to User table for full NextAuth compatibility`),
                !canRelateToAccount ? "User table needs 'id' column as primary key for Account relationship" : null
            ].filter(Boolean)
        });
    } catch (error: any) {
        console.error('Schema check error:', error);
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 500 });
    }
} 