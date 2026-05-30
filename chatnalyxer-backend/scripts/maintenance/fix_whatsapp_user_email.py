from sqlalchemy import create_engine, text
from app.database import DATABASE_URL

def fix_whatsapp_user_email():
    """Fix the WhatsApp system user email to pass validation"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Update all users with the invalid email
        result = conn.execute(
            text("UPDATE users SET email = 'whatsapp@example.com' WHERE email = 'whatsapp@system.local'")
        )
        conn.commit()
        print(f"Updated {result.rowcount} user records with invalid email")

if __name__ == "__main__":
    fix_whatsapp_user_email()
    print("WhatsApp user email fixed successfully!")