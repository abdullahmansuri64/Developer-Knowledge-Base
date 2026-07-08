import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'knowledge_base'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres123'),
        port=os.getenv('DB_PORT', '5433')
    )
    print("✅ Successfully connected to PostgreSQL!")
    conn.close()
except Exception as e:
    print(f"❌ Failed to connect: {e}")