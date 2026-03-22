-- GroupsApp Migration: Add missing columns and tables to existing schema
-- Existing tables use VARCHAR(36) UUIDs

-- Add missing columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Update username from name for existing users
UPDATE users SET username = name WHERE username IS NULL;

-- Add missing columns to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    contact_user_id VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_contact (user_id, contact_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_read (message_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add status column to group_messages for read receipts
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS status ENUM('sent','delivered','read') DEFAULT 'sent';
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS message_type ENUM('text','file','image') DEFAULT 'text';
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS channel_id VARCHAR(36) DEFAULT NULL;

-- Add status and type to messages (DMs)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status ENUM('sent','delivered','read') DEFAULT 'sent';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type ENUM('text','file','image') DEFAULT 'text';
