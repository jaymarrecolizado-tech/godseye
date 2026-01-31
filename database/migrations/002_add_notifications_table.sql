-- =============================================================================
-- Migration: Add Notifications Table
-- Description: Creates the notifications table for the notification system
-- =============================================================================

-- Notifications table - Stores user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    user_id INT NOT NULL COMMENT 'Recipient user ID',
    type ENUM('project', 'import', 'user', 'system') DEFAULT 'system' COMMENT 'Notification type',
    title VARCHAR(255) NOT NULL COMMENT 'Notification title',
    message TEXT NOT NULL COMMENT 'Notification message',
    data JSON COMMENT 'Additional JSON data (e.g., project_id, import_id)',
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Whether notification has been read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When notification was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notifications table';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
