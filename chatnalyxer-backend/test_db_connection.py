#!/usr/bin/env python3
"""
Test Supabase database connection
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env file")
    sys.exit(1)

print("🔍 Testing Supabase Connection...")
print(f"📍 Database: {DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'Unknown'}")

# Fix protocol
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print("✅ Fixed postgres:// -> postgresql://")

# Add SSL mode
if "supabase" in DATABASE_URL and "sslmode" not in DATABASE_URL:
    delimiter = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{delimiter}sslmode=require"
    print("✅ Added sslmode=require")

# Create engine with proper settings
try:
    print("\n🔌 Creating database engine...")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 10
        }
    )
    
    print("✅ Engine created successfully")
    
    # Test connection
    print("\n🧪 Testing connection...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Connection successful!")
        
        # Try to get version
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"📊 PostgreSQL version: {version.split(',')[0]}")
        
        # Check if tables exist
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result.fetchall()]
        
        if tables:
            print(f"\n📋 Found {len(tables)} tables:")
            for table in tables:
                print(f"   - {table}")
        else:
            print("\n⚠️  No tables found. You may need to run migrations.")
    
    print("\n✅ All tests passed! Database is ready.")
    
except Exception as e:
    print(f"\n❌ Connection failed!")
    print(f"Error: {str(e)}")
    print("\n🔧 Troubleshooting tips:")
    print("1. Check if your Supabase project is active")
    print("2. Verify the DATABASE_URL in .env is correct")
    print("3. Check if your IP is allowed in Supabase settings")
    print("4. Ensure you have internet connectivity")
    sys.exit(1)
