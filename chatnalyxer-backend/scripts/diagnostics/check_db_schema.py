from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = inspector.get_columns('users')
print("Columns in users table:")
for column in columns:
    print(f"- {column['name']} ({column['type']})")
