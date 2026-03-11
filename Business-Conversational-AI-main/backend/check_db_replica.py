import sqlite3
import os

db_path = "c:/Users/hrush/Documents/GFG-Kmit/Business-Conversational-AI-main/backend/nykaa_data.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    conn.close()
