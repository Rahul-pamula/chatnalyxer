from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        print("Running migration: Creating notifications table...")
        
        # Create notifications table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
                    is_sent BOOLEAN DEFAULT FALSE,
                    sent_at TIMESTAMP WITH TIME ZONE,
                    notification_type VARCHAR(50) DEFAULT 'reminder',
                    related_event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                    related_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
                    expo_push_token VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created table: notifications")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("ℹ️ Table notifications already exists.")
            else:
                print(f"❌ Error creating notifications: {e}")
        
        # Create index for faster queries
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON notifications(user_id, scheduled_time, is_sent)"))
            print("✅ Created index on notifications")
        except Exception as e:
            print(f"⚠️ Index creation warning: {e}")
        
        # Add push_token column to users table
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN push_token VARCHAR(255)"))
            print("✅ Added push_token column to users")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Column push_token already exists.")
            else:
                print(f"⚠️ Error adding push_token: {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate()
