import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

# Get columns for messages table
columns = inspector.get_columns('messages')

print("Messages table columns:")
print("=" * 50)
for col in columns:
    print(f"  {col['name']:30} {col['type']}")
print("=" * 50)

# Check if deleted_at exists
has_deleted_at = any(col['name'] == 'deleted_at' for col in columns)
print(f"\n✅ deleted_at column exists: {has_deleted_at}")
