import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_feedback_fields():
    """
    Add Feedback Loop support columns to 'messages' table.
    """
    engine = create_engine(DATABASE_URL)
    
    col_name = "is_manual_override"
    col_def = "BOOLEAN DEFAULT FALSE NOT NULL"
    
    with engine.connect() as conn:
        try:
            logger.info(f"Attempting to add column '{col_name}'...")
            conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col_name} {col_def}"))
            logger.info(f"✅ Added column '{col_name}'")
        except Exception as e:
            err_msg = str(e).lower()
            if "duplicate column" in err_msg or "already exists" in err_msg:
                logger.info(f"ℹ️ Column '{col_name}' already exists. Skipping.")
            else:
                logger.error(f"❌ Failed to add column '{col_name}': {e}")

        conn.commit()
    
    logger.info("Migration complete.")

if __name__ == "__main__":
    migrate_feedback_fields()
