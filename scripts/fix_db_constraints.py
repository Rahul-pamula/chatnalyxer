import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path to import config if needed, or just hardcode for script
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'chatnalyxer-backend')))

from dotenv import load_dotenv

# Path to backend .env
backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'chatnalyxer-backend', '.env'))
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print(f"❌ Could not find DATABASE_URL in {backend_env_path}")
    sys.exit(1)

# Fix for Render/Heroku protocols
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def fix_constraints():
    print(f"🔌 Connecting to database...") # Don't print full URL for security
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("🔍 Checking and fixing Foreign Keys...")

        # 1. Groups -> UsersFK
        # Drop existing constraint
        print("   - Dropping constraint groups_user_id_fkey...")
        try:
            session.execute(text("ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_user_id_fkey"))
        except Exception as e:
            print(f"     ⚠️ {e}")
        
        # Add new constraint with CASCADE
        print("   - Adding constraint groups_user_id_fkey with CASCADE...")
        session.execute(text("ALTER TABLE groups ADD CONSTRAINT groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))

        # 2. Messages -> Users (Sender)
        print("   - Dropping constraint messages_sender_id_fkey...")
        try:
            session.execute(text("ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey"))
        except:
            pass
        print("   - Adding constraint messages_sender_id_fkey with CASCADE...")
        session.execute(text("ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE"))

        # 3. Messages -> Users (Receiver)
        try:
            session.execute(text("ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_user_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE messages ADD CONSTRAINT messages_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE"))

        # 4. Group Members -> Users
        try:
            session.execute(text("ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE group_members ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))

        # 5. Scheduled Events -> Users & Messages
        print("   - Fixing scheduled_events constraints...")
        try:
            session.execute(text("ALTER TABLE scheduled_events DROP CONSTRAINT IF EXISTS scheduled_events_user_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE scheduled_events ADD CONSTRAINT scheduled_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))

        try:
            session.execute(text("ALTER TABLE scheduled_events DROP CONSTRAINT IF EXISTS scheduled_events_message_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE scheduled_events ADD CONSTRAINT scheduled_events_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE"))

        # 6. Notifications -> Events & Users
        print("   - Fixing notifications constraints...")
        try:
            session.execute(text("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_related_event_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE notifications ADD CONSTRAINT notifications_related_event_id_fkey FOREIGN KEY (related_event_id) REFERENCES events(id) ON DELETE CASCADE"))

        try:
            session.execute(text("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))

        try:
            session.execute(text("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_related_message_id_fkey"))
        except:
            pass
        session.execute(text("ALTER TABLE notifications ADD CONSTRAINT notifications_related_message_id_fkey FOREIGN KEY (related_message_id) REFERENCES messages(id) ON DELETE CASCADE"))

        session.commit()
        print("✅ Constraints updated successfully!")

    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    fix_constraints()
