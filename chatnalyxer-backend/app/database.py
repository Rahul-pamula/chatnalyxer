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
    "pool_pre_ping": True,      # Test connections before using them
    "pool_recycle": 300,        # Recycle connections after 5 minutes
    "pool_size": 10,            # Increased pool for better handling
    "max_overflow": 20,         # More overflow connections
    "pool_timeout": 30,         # Timeout for getting connection from pool
    "echo_pool": False,         # Set to True for debugging pool issues
    "connect_args": {}
}

# Add SSL context and timeout for Supabase
if "supabase" in DATABASE_URL:
    engine_kwargs["connect_args"]["sslmode"] = "require"
    engine_kwargs["connect_args"]["connect_timeout"] = 30  # Increased from 10 to 30 seconds
    engine_kwargs["connect_args"]["keepalives"] = 1
    engine_kwargs["connect_args"]["keepalives_idle"] = 30
    engine_kwargs["connect_args"]["keepalives_interval"] = 10
    engine_kwargs["connect_args"]["keepalives_count"] = 5

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
