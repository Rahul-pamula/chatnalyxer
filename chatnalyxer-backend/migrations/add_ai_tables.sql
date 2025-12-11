-- User Context (AI Memory)
CREATE TABLE IF NOT EXISTS user_context (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    context_data JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    important_contacts JSONB DEFAULT '[]',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI-Analyzed Messages
CREATE TABLE IF NOT EXISTS analyzed_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    group_name VARCHAR(255),
    sender_name VARCHAR(255),
    message_type VARCHAR(50), -- text, image, pdf, voice
    original_content TEXT,
    ai_summary TEXT,
    priority VARCHAR(20), -- high, medium, low
    category VARCHAR(50), -- work, personal, urgent, etc
    action_items JSONB DEFAULT '[]',
    deadline TIMESTAMP,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI-Generated Tasks
CREATE TABLE IF NOT EXISTS ai_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    source_message_id INTEGER REFERENCES analyzed_messages(id),
    task_description TEXT NOT NULL,
    priority VARCHAR(20),
    deadline TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- pending, done
    created_by_ai BOOLEAN DEFAULT true,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context_used JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analyzed_messages_user ON analyzed_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_messages_priority ON analyzed_messages(priority);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user ON ai_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
