#!/usr/bin/env python3
"""
Check what tables exist in the database
"""
from app.database import engine
from sqlalchemy import text


def check_tables():
    """Check what tables exist in the database"""
    print("Checking database tables...")

    try:
        with engine.connect() as conn:
            # Check what tables exist
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))

            tables = result.fetchall()
            print(f"Found {len(tables)} tables:")
            for table in tables:
                print(f"  - {table[0]}")

            if not tables:
                print("No tables found. Creating tables...")
                from app.models import Base
                Base.metadata.create_all(bind=engine)
                print("✅ Database tables created successfully!")

                # Check again
                result = conn.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """))
                tables = result.fetchall()
                print(f"Now found {len(tables)} tables:")
                for table in tables:
                    print(f"  - {table[0]}")

    except Exception as e:
        print(f"Error checking tables: {e}")


if __name__ == "__main__":
    check_tables()
