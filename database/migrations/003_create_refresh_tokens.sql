-- Security Audit Remediation Migration
-- Creates refresh_tokens table for persistent token storage (HIGH-004)
-- Date: February 9, 2026

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  last_used_at DATETIME NULL,
  
  INDEX idx_user_token (user_id, token_hash),
  INDEX idx_expires (expires_at),
  INDEX idx_revoked (revoked_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE refresh_tokens COMMENT = 'Persistent storage for JWT refresh tokens - replaces in-memory Set for scalability and security';
