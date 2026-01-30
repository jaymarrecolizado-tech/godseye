-- =============================================================================
-- Test Users Seed Data
-- Creates test users for authentication testing
-- =============================================================================

-- Password for all test users: 'password123' (hashed with bcrypt, 10 rounds)
-- Hash: $2a$10$YourHashedPasswordHere

-- Insert test users if they don't exist
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
('admin', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'Admin', TRUE),
('manager', 'manager@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Project Manager', 'Manager', TRUE),
('editor', 'editor@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Content Editor', 'Editor', TRUE),
('viewer', 'viewer@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'View Only User', 'Viewer', TRUE)
ON DUPLICATE KEY UPDATE 
    updated_at = CURRENT_TIMESTAMP;

-- Note: The password hash above corresponds to 'password123'
-- To generate a new hash: 
-- Node.js: require('bcryptjs').hashSync('yourpassword', 10)
