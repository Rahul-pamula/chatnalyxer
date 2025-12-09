#!/usr/bin/env python3
"""
Complete database setup for new PostgreSQL database
Creates all tables and adds all necessary columns
"""
from app.database import engine, Base
from sqlalchemy import text, MetaData
from sqlalchemy.exc import SQLAlchemyError


def setup_database():
    """Set up the complete database with all tables and columns"""

    print("🚀 Starting complete database setup...")

    try:
        # Step 1: Create all base tables
        print("📋 Creating base tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Base tables created successfully!")

        # Step 2: Add all additional columns
        print("🔧 Adding additional columns...")

        with engine.begin() as connection:
            # Check current schema
            metadata = MetaData()
            metadata.reflect(bind=engine)
            existing_tables = metadata.tables.keys()
            print(f"📊 Found tables: {list(existing_tables)}")

            if 'messages' in existing_tables:
                # Add ML columns to messages table
                ml_columns = {
                    'priority_level': 'VARCHAR(10) DEFAULT \'MEDIUM\' NOT NULL',
                    'urgency_score': 'FLOAT DEFAULT 0.5 NOT NULL',
                    'deadline_extracted': 'TIMESTAMP WITH TIME ZONE NULL',
                    'extracted_keywords': 'TEXT NULL',
                    'is_priority': 'INTEGER DEFAULT 0 NOT NULL',
                    'message_category': 'VARCHAR(20) DEFAULT \'GENERAL\' NOT NULL',
                    'academic_context': 'TEXT NULL',
                    'deleted_at': 'TIMESTAMP WITH TIME ZONE NULL'
                }

                # Check which columns already exist
                result = connection.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = 'messages' AND table_schema = 'public'
                """))
                existing_columns = [row[0] for row in result]

                for col_name, col_def in ml_columns.items():
                    if col_name not in existing_columns:
                        print(f"  ➕ Adding column: {col_name}")
                        connection.execute(
                            text(f'ALTER TABLE messages ADD COLUMN {col_name} {col_def}'))
                    else:
                        print(f"  ✅ Column {col_name} already exists")

            if 'groups' in existing_tables:
                # Add columns to groups table
                group_columns = {
                    'whatsapp_id': 'VARCHAR(255) UNIQUE NULL',
                    'is_selected': 'INTEGER DEFAULT 0 NOT NULL',
                    'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL'
                }

                result = connection.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = 'groups' AND table_schema = 'public'
                """))
                existing_columns = [row[0] for row in result]

                for col_name, col_def in group_columns.items():
                    if col_name not in existing_columns:
                        print(f"  ➕ Adding column to groups: {col_name}")
                        connection.execute(
                            text(f'ALTER TABLE groups ADD COLUMN {col_name} {col_def}'))
                        if col_name == 'whatsapp_id':
                            connection.execute(
                                text('CREATE INDEX IF NOT EXISTS ix_groups_whatsapp_id ON groups (whatsapp_id)'))
                    else:
                        print(
                            f"  ✅ Column {col_name} already exists in groups")

        print("🎉 Database setup completed successfully!")
        print("\n📋 Final table structure:")
        with engine.connect() as conn:
            for table_name in ['users', 'groups', 'group_members', 'messages']:
                result = conn.execute(text(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}' AND table_schema = 'public'
                    ORDER BY ordinal_position
                """))
                columns = result.fetchall()
                print(f"\n{table_name.upper()} table ({len(columns)} columns):")
                for col in columns:
                    nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
                    print(f"  - {col[0]}: {col[1]} {nullable}")

    except SQLAlchemyError as e:
        print(f"❌ Database setup failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

    return True


if __name__ == "__main__":
    success = setup_database()
    if success:
        print("\n🎯 Your new database is now fully set up and ready to use!")
        print("All tables and columns have been created according to your models.py")
    else:
        print("\n💥 Database setup failed. Please check your DATABASE_URL and try again.")
