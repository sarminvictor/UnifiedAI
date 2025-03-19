import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// This endpoint specifically fixes the column name case mismatch issue
export async function GET() {
    try {
        // Get database connection string
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'DATABASE_URL environment variable is not set'
            }, { status: 500 });
        }

        console.log('Starting NextAuth schema case fix procedure...');

        // Create direct PostgreSQL connection with SSL disabled
        const pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            },
            max: 1 // Use only one connection
        });

        // Test connection first
        const client = await pool.connect();
        console.log('Connection successful, checking tables...');

        // Helper function to check if a column exists
        const columnExists = async (table: string, column: string) => {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = $1
                    AND column_name = $2
                ) as exists;
            `, [table, column]);
            return result.rows[0].exists;
        };

        // Helper function to check if table exists
        const tableExists = async (table: string) => {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                ) as exists;
            `, [table]);
            return result.rows[0].exists;
        };

        const results: {
            tables: Record<string, boolean>;
            changes: string[];
            errors: string[];
        } = {
            tables: {
                users: await tableExists('users'),
                User: await tableExists('User'),
                accounts: await tableExists('accounts'),
                Account: await tableExists('Account'),
                sessions: await tableExists('sessions'),
                Session: await tableExists('Session'),
                verification_tokens: await tableExists('verification_tokens'),
                VerificationToken: await tableExists('VerificationToken')
            },
            changes: [],
            errors: []
        };

        console.log('Table existence check:', results.tables);

        // Check for snake_case vs camelCase column names
        try {
            if (results.tables.accounts) {
                const hasUserId = await columnExists('accounts', 'userId');
                const hasUser_id = await columnExists('accounts', 'user_id');

                if (hasUserId && !hasUser_id) {
                    // Need to add user_id column as alias for userId
                    console.log('Adding user_id column to accounts table...');
                    await client.query(`
                        ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "user_id" TEXT GENERATED ALWAYS AS ("userId") STORED;
                    `);
                    results.changes.push('Added user_id column to accounts table as alias for userId');
                }
            }

            if (results.tables.sessions) {
                const hasUserId = await columnExists('sessions', 'userId');
                const hasUser_id = await columnExists('sessions', 'user_id');

                if (hasUserId && !hasUser_id) {
                    // Need to add user_id column as alias for userId
                    console.log('Adding user_id column to sessions table...');
                    await client.query(`
                        ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_id" TEXT GENERATED ALWAYS AS ("userId") STORED;
                    `);
                    results.changes.push('Added user_id column to sessions table as alias for userId');
                }
            }

            // Check for provider column naming
            if (results.tables.accounts) {
                const hasProviderAccountId = await columnExists('accounts', 'providerAccountId');
                const hasProvider_account_id = await columnExists('accounts', 'provider_account_id');

                if (hasProviderAccountId && !hasProvider_account_id) {
                    console.log('Adding provider_account_id column to accounts table...');
                    await client.query(`
                        ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "provider_account_id" TEXT GENERATED ALWAYS AS ("providerAccountId") STORED;
                    `);
                    results.changes.push('Added provider_account_id column to accounts table as alias for providerAccountId');
                }
            }

            // Check for session token column naming
            if (results.tables.sessions) {
                const hasSessionToken = await columnExists('sessions', 'sessionToken');
                const hasSession_token = await columnExists('sessions', 'session_token');

                if (hasSessionToken && !hasSession_token) {
                    console.log('Adding session_token column to sessions table...');
                    await client.query(`
                        ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "session_token" TEXT GENERATED ALWAYS AS ("sessionToken") STORED;
                    `);
                    results.changes.push('Added session_token column to sessions table as alias for sessionToken');
                }
            }

            // Create index on user_id if needed
            if (results.tables.accounts) {
                console.log('Creating index on accounts.user_id if needed...');
                await client.query(`
                    CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts"("user_id");
                `);
                results.changes.push('Created index on accounts.user_id');
            }

            if (results.tables.sessions) {
                console.log('Creating index on sessions.user_id if needed...');
                await client.query(`
                    CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
                `);
                results.changes.push('Created index on sessions.user_id');
            }
        } catch (err) {
            console.error('Error fixing column case:', err);
            results.errors.push(String(err));
        }

        // Verify column existence after changes
        const verification = {
            accounts_userId: results.tables.accounts ? await columnExists('accounts', 'userId') : false,
            accounts_user_id: results.tables.accounts ? await columnExists('accounts', 'user_id') : false,
            accounts_providerAccountId: results.tables.accounts ? await columnExists('accounts', 'providerAccountId') : false,
            accounts_provider_account_id: results.tables.accounts ? await columnExists('accounts', 'provider_account_id') : false,
            sessions_userId: results.tables.sessions ? await columnExists('sessions', 'userId') : false,
            sessions_user_id: results.tables.sessions ? await columnExists('sessions', 'user_id') : false,
            sessions_sessionToken: results.tables.sessions ? await columnExists('sessions', 'sessionToken') : false,
            sessions_session_token: results.tables.sessions ? await columnExists('sessions', 'session_token') : false
        };

        console.log('Column verification after changes:', verification);

        // Release client and close pool
        client.release();
        await pool.end();

        return NextResponse.json({
            success: true,
            message: 'NextAuth schema case issues fixed',
            tables: results.tables,
            changes: results.changes,
            columns: verification,
            errors: results.errors
        });
    } catch (error) {
        console.error('Error fixing schema case issues:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null
        }, { status: 500 });
    }
} 