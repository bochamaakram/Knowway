-- Run this in Supabase SQL Editor to add chat functionality

-- Course Messages table (Chat)
CREATE TABLE IF NOT EXISTS course_messages (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_course ON course_messages(course_id, created_at);
