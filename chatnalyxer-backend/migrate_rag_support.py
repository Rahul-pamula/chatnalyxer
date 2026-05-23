import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_rag_fields():
    """
    Add RAG support columns to 'messages' table if they don't exist.
    """
    engine = create_engine(DATABASE_URL)
    
    # Columns to add
    columns = [
        ("media_url", "VARCHAR(500)"),
        ("media_type", "VARCHAR(20) DEFAULT 'text' NOT NULL"),
        ("extracted_text", "TEXT")
    ]
    
    with engine.connect() as conn:
        for col_name, col_def in columns:
            try:
                # Check if column exists (PostgreSQL specific check, adaptable for SQLite)
                # For simplicity in this hybrid env, we'll try to add and ignore "duplicate column" error
                logger.info(f"Attempting to add column '{col_name}'...")
                conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col_name} {col_def}"))
                logger.info(f"✅ Added column '{col_name}'")
            except Exception as e:
                # Check for "duplicate column" error
                err_msg = str(e).lower()
                if "duplicate column" in err_msg or "already exists" in err_msg:
                    logger.info(f"ℹ️ Column '{col_name}' already exists. Skipping.")
                else:
                    logger.error(f"❌ Failed to add column '{col_name}': {e}")

        conn.commit()
    
    logger.info("Migration complete.")

if __name__ == "__main__":
    migrate_rag_fields()
