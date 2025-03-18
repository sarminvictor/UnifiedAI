-- This script fixes issues with NextAuth tables and connection pooling
-- Run this in the Supabase SQL Editor

-- Begin transaction
BEGIN;

-- First, let's clean up any existing prepared statements
DO $$
BEGIN
    -- Deallocate all prepared statements
    EXECUTE 'DEALLOCATE ALL';
    
    -- Close idle connections that might be holding prepared statements
    EXECUTE 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = ''idle'' AND state_change < now() - interval ''30 minutes''';
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors from cleanup
END $$;

-- Ensure NextAuth tables exist with the correct structure
CREATE TABLE IF NOT EXISTS "Account" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    
    CONSTRAINT "Account_user_id_fkey" FOREIGN KEY (user_id) 
      REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "sessionToken" TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    expires TIMESTAMP NOT NULL,
    
    CONSTRAINT "Session_user_id_fkey" FOREIGN KEY (user_id) 
      REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    
    PRIMARY KEY (identifier, token)
);

-- Make sure the User table has all required fields for NextAuth
DO $$
BEGIN
    -- Add email_verified if missing
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name='User' AND column_name='email_verified') THEN
        ALTER TABLE "User" ADD COLUMN "email_verified" TIMESTAMP;
    END IF;

    -- Add image if missing
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name='User' AND column_name='image') THEN
        ALTER TABLE "User" ADD COLUMN "image" TEXT;
    END IF;
    
    -- Add resetToken if missing
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name='User' AND column_name='resetToken') THEN
        ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
    END IF;
END $$;

-- Create indexes to improve NextAuth performance
CREATE INDEX IF NOT EXISTS "Account_user_id_idx" ON "Account" (user_id);
CREATE INDEX IF NOT EXISTS "Session_user_id_idx" ON "Session" (user_id);

-- Create a function to clean up prepared statements
CREATE OR REPLACE FUNCTION cleanup_prepared_statements()
RETURNS void AS $$
BEGIN
    -- Deallocate all prepared statements
    EXECUTE 'DEALLOCATE ALL';
    
    -- Close idle connections
    EXECUTE 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = ''idle'' AND state_change < now() - interval ''30 minutes''';
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_prepared_statements() TO authenticated;

-- Commit all changes
COMMIT; 