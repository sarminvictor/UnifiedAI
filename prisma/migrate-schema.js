// Script to handle Prisma migrations with the correct connection URL
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

// Get the database URL from environment
let dbUrl = process.env.DATABASE_URL;

// Save original pooler URL
const originalUrl = dbUrl;

// Convert pooler URL to direct connection URL if needed
if (dbUrl && dbUrl.includes('pooler.supabase.com:6543')) {
    dbUrl = dbUrl
        .replace('aws-0-us-east-1.pooler.supabase.com:6543', 'db.woauvmkdxdibfontjvdi.supabase.co:5432')
        .replace('postgres.woauvmkdxdibfontjvdi:', 'postgres:');

    console.log('Converting pooler URL to direct connection for migrations');
}

// Create a temporary .env.migrate file with the direct connection
fs.writeFileSync(
    '.env.migrate',
    `DATABASE_URL=${dbUrl}\n`,
    'utf8'
);

try {
    console.log('Running migration with direct connection URL...');

    // Run the migration command with the temporary env file
    execSync('npx dotenv -e .env.migrate -- npx prisma migrate deploy', {
        stdio: 'inherit',
    });

    console.log('Migration completed successfully');
} catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
} finally {
    // Clean up the temporary file
    fs.unlinkSync('.env.migrate');
    console.log('Temporary migration environment file removed');
    console.log('Reverting to pooler URL for runtime');
} 