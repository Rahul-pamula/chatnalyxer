from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        print("Running migration: Adding extracted_content to messages table...")
        
        # Add extracted_content column
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN extracted_content TEXT"))
            print("✅ Added column: extracted_content")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Column extracted_content already exists.")
            else:
                print(f"❌ Error adding extracted_content: {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate()
