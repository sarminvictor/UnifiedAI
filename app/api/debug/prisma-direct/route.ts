import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function GET() {
    const timestamp = new Date().toISOString();

    try {
        // Test direct connection
        const connectionTest = await testConnection();

        // Test user table access
        const userTest = await testUserTable();

        // Get Prisma version
        const prismaVersion = await prisma.$queryRaw`SELECT version()`;

        return NextResponse.json({
            timestamp,
            status: 'success',
            connectionTest,
            userTest,
            prismaVersion: JSON.stringify(prismaVersion),
            message: 'Prisma connection direct test completed successfully'
        });

    } catch (error: any) {
        console.error('Prisma direct test error:', error);

        return NextResponse.json({
            timestamp,
            status: 'error',
            error: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            message: 'Failed to connect to database directly with Prisma'
        }, { status: 500 });
    }
}

async function testConnection() {
    try {
        // Test the connection by executing a simple query
        await prisma.$queryRaw`SELECT 1 as result`;
        return {
            success: true,
            message: 'Successfully connected to database'
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            message: 'Failed to connect to database'
        };
    }
}

async function testUserTable() {
    try {
        // Attempt to get the count of users
        const userCount = await prisma.user.count();

        // Get schema info
        const schemaInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `;

        return {
            success: true,
            userCount,
            schema: schemaInfo,
            message: 'Successfully queried User table'
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            message: 'Failed to access User table'
        };
    }
} 