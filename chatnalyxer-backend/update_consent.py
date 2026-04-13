import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User

# Load environment variables manually
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            os.environ['DATABASE_URL'] = line.strip().split('=', 1)[1]

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found in environment")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Querying users...")
users = db.query(User).all()

for user in users:
    print(f"User {user.id} ({user.phone_number}): consent_accepted={getattr(user, 'consent_accepted', None)}")
    user.consent_accepted = True
    user.consent_whatsapp = True
    user.consent_version = 'v1'

print("Committing changes...")
db.commit()
print("Done!")
