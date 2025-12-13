#!/usr/bin/env python3
"""
Deadline Cleanup Scheduler
Run this script periodically (e.g., every hour) via Windows Task Scheduler or cron
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.services.deadline_cleanup import cleanup_service
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main cleanup function"""
    logger.info("=" * 60)
    logger.info("Starting deadline cleanup service...")
    logger.info("=" * 60)
    
    db = SessionLocal()
    try:
        count = cleanup_service.cleanup_expired(db)
        logger.info(f"✅ Cleanup complete. Deleted {count} expired messages.")
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
    
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
