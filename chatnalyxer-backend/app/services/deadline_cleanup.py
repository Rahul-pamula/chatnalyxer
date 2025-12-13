"""
Deadline Cleanup Service
Automatically soft-deletes messages that have passed their deadline
"""
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models

logger = logging.getLogger(__name__)


class DeadlineCleanupService:
    """Service to automatically delete expired deadline messages"""
    
    def __init__(self):
        self.logger = logger
    
    def cleanup_expired(self, db: Session) -> int:
        """
        Soft-delete messages with expired deadlines
        
        Args:
            db: Database session
            
        Returns:
            Count of deleted messages
        """
        now = datetime.now()
        
        # Find messages with deadlines in the past that aren't already deleted
        expired_messages = db.query(models.Message).filter(
            models.Message.deadline_extracted.isnot(None),
            models.Message.deadline_extracted < now,
            models.Message.deleted_at.is_(None)
        ).all()
        
        count = len(expired_messages)
        
        if count > 0:
            # Soft delete by setting deleted_at timestamp
            for msg in expired_messages:
                msg.deleted_at = func.now()
                self.logger.info(f"Deleted expired message ID {msg.id}: {msg.content[:50]}...")
            
            db.commit()
            self.logger.info(f"✅ Cleaned up {count} expired messages")
        else:
            self.logger.info("No expired messages found")
        
        return count


# Global instance
cleanup_service = DeadlineCleanupService()
