"""
Database Cleanup Script - Remove Incorrect Group Memberships

This script removes all group memberships from the database to prepare for the
user-group isolation fix. After running this script, users will need to re-link
their WhatsApp accounts to see their groups.

WARNING: This will remove ALL group memberships. Make sure you have a backup.
"""

from app.database import SessionLocal
from app import models

def cleanup_group_memberships():
    db = SessionLocal()
    try:
        # Count existing memberships
        count = db.query(models.GroupMember).count()
        print(f"Found {count} group memberships to remove")
        
        # Delete all group memberships
        db.query(models.GroupMember).delete()
        db.commit()
        
        print(f"✅ Successfully removed {count} group memberships")
        print("Users will need to re-link their WhatsApp to see their groups")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during cleanup: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    response = input("This will remove ALL group memberships. Are you sure? (yes/no): ")
    if response.lower() == "yes":
        cleanup_group_memberships()
    else:
        print("Cleanup cancelled")
