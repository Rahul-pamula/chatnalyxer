import psycopg2
import sys

def test_connection(url, label):
    print(f"\n--- Testing {label} ---")
    print(f"URL: {url.split('@')[-1]}") # Hide password for logs
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        print(f"OK Success connecting to {label}!")
        conn.close()
        return True
    except Exception as e:
        print(f"ERROR Failed: {e}")
        return False

# Base credentials from user's .env
USER = "postgres.hxbwhzkjvosdrksnrgwg"
PASSWORD = "@textNLytixs123"
PROJECT_REF = "hxbwhzkjvosdrksnrgwg"

# URLs to test
pooler_url = f"postgresql://{USER}:%40textNLytixs123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
# Standard direct host: db.[PROJECT_REF].supabase.co
direct_url = f"postgresql://postgres:{PASSWORD}@db.{PROJECT_REF}.supabase.co:5432/postgres"

res1 = test_connection(pooler_url, "Port 6543 (Pooler)")
res2 = test_connection(direct_url, "Port 5432 (Direct)")

if not res1 and not res2:
    print("\nWARNING Both connection methods failed. This strongly suggests your Supabase project is PAUSED or the Reference ID is incorrect.")
elif res2:
    print("\nINFO Direct connection (5432) works! Recommend updating .env to use this.")
elif res1:
    print("\nINFO Pooler connection (6543) works! The earlier crash might have been a transient network issue.")
