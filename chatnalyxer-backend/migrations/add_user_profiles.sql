-- Add user_type and profile_data columns to users table if they don't exist
ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'CASUAL' NOT NULL;
ALTER TABLE users ADD COLUMN profile_data JSON DEFAULT '{}';

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    user_type VARCHAR(50) DEFAULT 'CASUAL' NOT NULL,
    profile_data JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
