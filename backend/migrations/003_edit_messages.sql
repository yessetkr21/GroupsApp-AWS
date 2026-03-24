-- GroupsApp Migration: Add edited_at column for message editing
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at DATETIME DEFAULT NULL;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS edited_at DATETIME DEFAULT NULL;
