import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Create and return a database connection"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'knowledge_base'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'postgres123'),
            port=os.getenv('DB_PORT', '5433')
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def init_db():
    """Initialize database tables"""
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return
    
    try:
        cur = conn.cursor()
        
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create categories table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT
            )
        """)
        
        # Create articles table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                status VARCHAR(20) DEFAULT 'draft',
                views INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert default categories
        default_categories = [
            ('Frontend', 'Frontend development technologies and best practices'),
            ('Backend', 'Backend development, APIs, and server-side technologies'),
            ('Database', 'Database design, optimization, and management'),
            ('DevOps', 'DevOps practices, CI/CD, and infrastructure'),
            ('AI', 'Artificial Intelligence, Machine Learning, and Data Science'),
            ('Python', 'Python programming language and frameworks'),
            ('React', 'React library and ecosystem'),
            ('PostgreSQL', 'PostgreSQL database management and optimization')
        ]
        
        for name, description in default_categories:
            cur.execute("""
                INSERT INTO categories (name, description)
                VALUES (%s, %s)
                ON CONFLICT (name) DO NOTHING
            """, (name, description))
        
        conn.commit()
        cur.close()
        conn.close()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Database initialization error: {e}")
        if conn:
            conn.rollback()
            conn.close()