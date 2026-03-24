-- GroupsApp Migration: Message Reactions
-- Additive migration - does NOT modify any existing tables

CREATE TABLE IF NOT EXISTS message_reactions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    message_table ENUM('messages', 'group_messages') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reaction (message_id, user_id, emoji)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
