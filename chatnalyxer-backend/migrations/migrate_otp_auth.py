#!/usr/bin/env python3
"""
Database Migration: Add OTP Authentication Support
- Create otps table
- Add phone_number, is_verified to users table
- Make email and hashed_password nullable
"""
from app.database import engine
from sqlalchemy import text

def migrate_otp_auth():
    """Migrate database to support OTP authentication"""
    print("Starting OTP authentication migration...")
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Check if we're using SQLite or PostgreSQL
            result = conn.execute(text("SELECT 1"))
            db_type = str(conn.dialect.name)
            print(f"Database type: {db_type}")
            
            # 1. Create otps table
            print("Creating otps table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS otps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone_number VARCHAR(20) NOT NULL,
                    otp_code VARCHAR(6) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    is_used INTEGER DEFAULT 0 NOT NULL,
                    attempts INTEGER DEFAULT 0 NOT NULL
                )
            """ if db_type == 'sqlite' else """
                CREATE TABLE IF NOT EXISTS otps (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(20) NOT NULL,
                    otp_code VARCHAR(6) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    is_used INTEGER DEFAULT 0 NOT NULL,
                    attempts INTEGER DEFAULT 0 NOT NULL
                )
            """))
            
            # Create index on phone_number
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_otps_phone_number ON otps(phone_number)
            """))
            print("✅ otps table created")
            
            # 2. Check if phone_number column exists in users table
            if db_type == 'sqlite':
                result = conn.execute(text("""
                    PRAGMA table_info(users)
                """))
                columns = [row[1] for row in result]
            else:
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'users'
                """))
                columns = [row[0] for row in result]
            
            # 3. Add phone_number column if it doesn't exist
            if 'phone_number' not in columns:
                print("Adding phone_number column to users table...")
                conn.execute(text("""
                    ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)
                """))
                print("✅ phone_number column added")
            else:
                print("⏭️  phone_number column already exists")
            
            # 4. Add is_verified column if it doesn't exist
            if 'is_verified' not in columns:
                print("Adding is_verified column to users table...")
                conn.execute(text("""
                    ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0 NOT NULL
                """))
                print("✅ is_verified column added")
            else:
                print("⏭️  is_verified column already exists")
            
            # 5. Make email and hashed_password nullable (SQLite doesn't support ALTER COLUMN)
            if db_type == 'postgresql':
                print("Making email and hashed_password nullable...")
                conn.execute(text("""
                    ALTER TABLE users ALTER COLUMN email DROP NOT NULL
                """))
                conn.execute(text("""
                    ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL
                """))
                print("✅ email and hashed_password are now nullable")
            else:
                print("⚠️  SQLite doesn't support ALTER COLUMN - email/password will remain NOT NULL")
                print("   For SQLite, you'll need to recreate the table to make them nullable")
            
            # 6. Create unique index on phone_number
            try:
                conn.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number)
                """))
                print("✅ Unique index created on phone_number")
            except Exception as e:
                print(f"⚠️  Index might already exist: {e}")
            
            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Update existing users with phone numbers (if any)")
            print("2. Test OTP authentication flow")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate_otp_auth()
