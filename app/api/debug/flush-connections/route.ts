import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// This endpoint attempts to flush all existing prepared statements and connections
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

        console.log('Starting database connection flush procedure...');

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
        console.log('Connection successful, getting active connections...');

        // Get information about active connections and prepared statements
        const activeConnections = await client.query(`
            SELECT pid, query_start, state, query 
            FROM pg_stat_activity 
            WHERE datname = current_database() 
            AND pid != pg_backend_pid()
        `);

        console.log(`Found ${activeConnections.rowCount} active connections`);

        // Find prepared statements
        const preparedStatements = await client.query(`
            SELECT name, statement
            FROM pg_prepared_statements
        `);

        console.log(`Found ${preparedStatements.rowCount} prepared statements`);

        // Attempt to cancel any long-running queries
        const cancelledQueries = [];
        for (const conn of activeConnections.rows) {
            if (conn.state === 'active' &&
                conn.query_start &&
                (new Date().getTime() - new Date(conn.query_start).getTime() > 5000)) {
                try {
                    console.log(`Cancelling query on pid ${conn.pid}`);
                    await client.query(`SELECT pg_cancel_backend(${conn.pid})`);
                    cancelledQueries.push(conn.pid);
                } catch (err) {
                    console.error(`Failed to cancel query on pid ${conn.pid}:`, err);
                }
            }
        }

        // Deallocate all prepared statements in this session
        for (const stmt of preparedStatements.rows) {
            try {
                console.log(`Deallocating prepared statement: ${stmt.name}`);
                await client.query(`DEALLOCATE IF EXISTS "${stmt.name}"`);
            } catch (err) {
                console.error(`Failed to deallocate prepared statement ${stmt.name}:`, err);
            }
        }

        // Terminate long inactive connections (more aggressive)
        const terminatedConnections = [];
        for (const conn of activeConnections.rows) {
            if (conn.state === 'idle' &&
                conn.query_start &&
                (new Date().getTime() - new Date(conn.query_start).getTime() > 30000)) {
                try {
                    console.log(`Terminating idle connection pid ${conn.pid}`);
                    await client.query(`SELECT pg_terminate_backend(${conn.pid})`);
                    terminatedConnections.push(conn.pid);
                } catch (err) {
                    console.error(`Failed to terminate connection pid ${conn.pid}:`, err);
                }
            }
        }

        // Release the client and close pool
        client.release();
        await pool.end();

        return NextResponse.json({
            success: true,
            message: 'Database connections flushed',
            activeConnections: activeConnections.rowCount,
            preparedStatements: preparedStatements.rowCount,
            cancelledQueries,
            terminatedConnections
        });
    } catch (error) {
        console.error('Error flushing connections:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null
        }, { status: 500 });
    }
} 