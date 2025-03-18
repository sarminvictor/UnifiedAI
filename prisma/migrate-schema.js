// Script to handle Prisma migrations with the correct connection URL
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

// Get the database URL from environment
let dbUrl = process.env.DATABASE_URL;

console.log('Original DATABASE_URL:', dbUrl ? 'URL found (not showing for security)' : 'not set');

// Check if URL is pooler URL (port 6543)
const isPoolerUrl = dbUrl && (
    dbUrl.includes('pooler.supabase.com:6543') ||
    dbUrl.includes('.pooler.') ||
    dbUrl.includes('postgres.woauvmkdxdibfontjvdi:')
);

// Only convert if it's a pooler URL
if (isPoolerUrl) {
    console.log('Detected pooler URL, converting to direct connection for database operations');

    // Convert to direct connection URL
    dbUrl = dbUrl
        .replace('aws-0-us-east-1.pooler.supabase.com:6543', 'db.woauvmkdxdibfontjvdi.supabase.co:5432')
        .replace('postgres.woauvmkdxdibfontjvdi:', 'postgres:');

    console.log('Converted to direct connection URL (not showing for security)');
} else {
    console.log('Using direct connection URL (not a pooler URL)');
}

// Add PgBouncer parameters to avoid prepared statement issues
if (dbUrl) {
    if (!dbUrl.includes('?')) {
        dbUrl += '?';
    } else if (!dbUrl.endsWith('&')) {
        dbUrl += '&';
    }

    // Add parameters that help with connection pooling
    dbUrl += 'schema=public&connection_limit=1&pool_timeout=0&application_name=prisma_migrate&sslmode=require';

    console.log('Added connection parameters for reliability');
}

// Create a temporary .env.migrate file with the direct connection
fs.writeFileSync(
    '.env.migrate',
    `DATABASE_URL="${dbUrl}"\n`,
    'utf8'
);

try {
    console.log('Running prisma db push with direct connection URL...');

    // Simple db push - more reliable than migrations for serverless
    execSync('npx dotenv -e .env.migrate -- npx prisma db push --accept-data-loss --skip-generate', {
        stdio: 'inherit',
    });

    console.log('Schema push completed successfully');
} catch (error) {
    console.error('Schema push error:', error);

    // Continue the build even if push fails
    console.log('WARNING: Schema push had errors but continuing build process');
} finally {
    // Clean up the temporary file
    try {
        fs.unlinkSync('.env.migrate');
        console.log('Temporary environment file removed');
    } catch (e) {
        console.error('Failed to clean up temp file:', e.message);
    }
} 