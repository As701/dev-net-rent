import sqlite3
import json
import os

DB_PATH = r'C:\Users\world\.dachago\tmp\system32\DachaGo\server\database.sqlite'

def diag():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--- TABLES ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t[0]}")
        count = cursor.fetchone()[0]
        print(f"Table: {t[0]}, Rows: {count}")

    print("\n--- LISTINGS SAMPLE ---")
    cursor.execute("SELECT id, title, owner_id, status FROM listings")
    listings = cursor.fetchall()
    for l in listings:
        print(l)

    print("\n--- USERS SAMPLE ---")
    cursor.execute("SELECT id, email, name FROM users")
    users = cursor.fetchall()
    for u in users:
        print(u)

    conn.close()

if __name__ == "__main__":
    diag()
