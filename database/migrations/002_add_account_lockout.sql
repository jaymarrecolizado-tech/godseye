-- Security Audit Remediation Migration
-- Implements account lockout mechanism (HIGH-002)
-- Date: February 9, 2026

-- Add failed_login_attempts column to users table
ALTER TABLE users 
ADD COLUMN failed_login_attempts INT DEFAULT 0;

-- Add locked_until column to users table
ALTER TABLE users 
ADD COLUMN locked_until DATETIME NULL;

-- Add index on locked_until for faster queries on active lockouts
CREATE INDEX idx_users_locked_until ON users(locked_until);
