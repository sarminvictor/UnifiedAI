// Script to fix schema issues by directly executing SQL
const { Client } = require('pg');
require('dotenv').config();

// Get database configuration from environment
let dbUrl = process.env.DATABASE_URL;

// Convert pooler URL to direct connection if needed
if (dbUrl && (dbUrl.includes('pooler.supabase.com:6543') || dbUrl.includes('postgres.woauvmkdxdibfontjvdi:'))) {
  dbUrl = dbUrl
    .replace('aws-0-us-east-1.pooler.supabase.com:6543', 'db.woauvmkdxdibfontjvdi.supabase.co:5432')
    .replace('postgres.woauvmkdxdibfontjvdi:', 'postgres:');
  console.log('Converting pooler URL to direct connection for schema fixes');
} else {
  console.log('Using direct connection URL (not a pooler URL)');
}

// Function to create a new client for each operation to prevent prepared statement issues
async function executeQuery(query, params = []) {
  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    const result = await client.query(query, params);
    return result;
  } finally {
    await client.end();
  }
}

async function tableExists(tableName) {
  const result = await executeQuery(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        );
    `, [tableName]);

  return result.rows[0].exists;
}

async function main() {
  try {
    console.log('Connecting to database...');

    // Check if User table exists
    const userTableExists = await tableExists('User');
    console.log('User table exists:', userTableExists);

    // Check if Account table exists
    const accountTableExists = await tableExists('Account');
    console.log('Account table exists:', accountTableExists);

    // Create User table if it doesn't exist
    if (!userTableExists) {
      console.log('Creating User table...');
      await executeQuery(`
                CREATE TABLE "User" (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    email TEXT UNIQUE,
                    "emailVerified" TIMESTAMP(3),
                    image TEXT,
                    credits_remaining TEXT DEFAULT '50',
                    planId TEXT,
                    "subscriptionStatus" TEXT,
                    "stripeCustomerId" TEXT
                );
            `);
      console.log('User table created successfully!');
    }

    // Create Account table if it doesn't exist
    if (!accountTableExists) {
      console.log('Creating Account table...');
      await executeQuery(`
                CREATE TABLE "Account" (
                    id TEXT PRIMARY KEY,
                    "userId" TEXT NOT NULL,
                    type TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    "providerAccountId" TEXT NOT NULL,
                    refresh_token TEXT,
                    access_token TEXT,
                    expires_at INTEGER,
                    token_type TEXT,
                    scope TEXT,
                    id_token TEXT,
                    session_state TEXT,
                    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE ON UPDATE CASCADE
                );
            `);
      console.log('Account table created successfully!');

      // Add unique constraint for provider and providerAccountId
      await executeQuery(`
                CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" 
                ON "Account"(provider, "providerAccountId");
            `);
      console.log('Added unique constraint on Account table');
    }

    // Check if Session table exists and create if needed
    const sessionTableExists = await tableExists('Session');
    console.log('Session table exists:', sessionTableExists);

    if (!sessionTableExists) {
      console.log('Creating Session table...');
      await executeQuery(`
                CREATE TABLE "Session" (
                    id TEXT PRIMARY KEY,
                    "sessionToken" TEXT UNIQUE NOT NULL,
                    "userId" TEXT NOT NULL,
                    expires TIMESTAMP(3) NOT NULL,
                    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE ON UPDATE CASCADE
                );
            `);
      console.log('Session table created successfully!');
    }

    // Check if VerificationToken table exists and create if needed
    const verificationTokenTableExists = await tableExists('VerificationToken');
    console.log('VerificationToken table exists:', verificationTokenTableExists);

    if (!verificationTokenTableExists) {
      console.log('Creating VerificationToken table...');
      await executeQuery(`
                CREATE TABLE "VerificationToken" (
                    identifier TEXT NOT NULL,
                    token TEXT NOT NULL,
                    expires TIMESTAMP(3) NOT NULL,
                    CONSTRAINT "VerificationToken_identifier_token_key" PRIMARY KEY ("identifier", "token")
                );
            `);
      console.log('VerificationToken table created successfully!');
    }

    console.log('Schema fix completed successfully!');
  } catch (error) {
    console.error('Error fixing schema:', error);
    throw error;
  }
}

main()
  .catch((err) => {
    console.error('Schema fix failed:', err);
    process.exit(1);
  }); 