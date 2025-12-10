import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is not set in .env")

# Fix for Render/Heroku protocols (postgres:// -> postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure SSL mode for Supabase (fixes SSL connection closed error)
if "supabase" in DATABASE_URL:
    # Add SSL parameters if not present
    if "sslmode" not in DATABASE_URL:
        delimiter = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL += f"{delimiter}sslmode=require"

# Create engine with connection pooling settings for Supabase
engine_kwargs = {
    "pool_pre_ping": True,  # Test connections before using them
    "pool_recycle": 300,    # Recycle connections after 5 minutes
    "pool_size": 5,         # Smaller pool for development
    "max_overflow": 10,     # Max extra connections
    "connect_args": {}
}

# Add SSL context for Supabase
if "supabase" in DATABASE_URL:
    engine_kwargs["connect_args"]["sslmode"] = "require"
    engine_kwargs["connect_args"]["connect_timeout"] = 10

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
