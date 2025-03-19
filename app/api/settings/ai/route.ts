import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';
import { AIProvider } from '@/types/ai.types';
import { serverLogger } from '@/utils/serverLogger';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Get current settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        serverLogger.info('AI Settings GET request:', {
            hasSession: !!session,
            userEmail: session?.user?.email
        });

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await prisma.$queryRaw`
            SELECT us.ai_provider, us.ai_model 
            FROM user_settings us
            JOIN "User" u ON u.id = us.user_id
            WHERE u.email = ${session.user.email}
        `;

        serverLogger.info('Settings found:', {
            hasSettings: !!settings,
            settings
        });

        const userSettings = Array.isArray(settings) ? settings[0] : null;

        return NextResponse.json({
            provider: userSettings?.ai_provider || AIProvider.OPENAI,
            model: userSettings?.ai_model || 'gpt-3.5-turbo'
        });
    } catch (error) {
        serverLogger.error('Error in AI Settings GET:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Update settings
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        serverLogger.info('AI Settings POST request:', {
            hasSession: !!session,
            userEmail: session?.user?.email
        });

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { provider, model } = await request.json();
        serverLogger.info('Received settings update:', { provider, model });

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Use raw query for upsert since the model name is giving us trouble
        await prisma.$executeRaw`
            INSERT INTO user_settings (user_id, ai_provider, ai_model)
            VALUES (${user.id}, ${provider}, ${model})
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                ai_provider = ${provider},
                ai_model = ${model},
                updated_at = NOW()
        `;

        serverLogger.info('Settings updated successfully:', {
            provider,
            model
        });

        return NextResponse.json({
            provider,
            model
        });
    } catch (error) {
        serverLogger.error('Error in AI Settings POST:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 