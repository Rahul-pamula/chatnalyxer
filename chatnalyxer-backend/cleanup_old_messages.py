from sqlalchemy import create_engine, text
from app.database import DATABASE_URL

def cleanup_old_messages():
    """Remove all old messages and keep only the fresh ones"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Check messages before cleanup
        result = conn.execute(text("SELECT COUNT(*) FROM messages"))
        before_count = result.scalar()
        print(f"Messages before cleanup: {before_count}")

        # Delete all messages (we'll keep only new real messages)
        result = conn.execute(text("DELETE FROM messages"))
        conn.commit()
        print(f"Deleted {result.rowcount} old messages")

        # Check messages after cleanup
        result = conn.execute(text("SELECT COUNT(*) FROM messages"))
        after_count = result.scalar()
        print(f"Messages after cleanup: {after_count}")

if __name__ == "__main__":
    cleanup_old_messages()
    print("Database cleanup completed successfully!")