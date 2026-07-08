from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import os
import bcrypt
import jwt
import psycopg2
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv
import secrets
import string
import re
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import socket
import json

# 🔹 Import the AI chat registration function
from ai_chat import register_ai_chat_route

load_dotenv()
app = Flask(__name__)
CORS(app)
OLLAMA_MODEL = "gemma2:2b"

# ============================================================
# DATABASE CONNECTION
# ============================================================
def get_db_connection():
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
        print(f"DB error: {e}")
        return None

# ============================================================
# INIT DATABASE
# ============================================================
def init_db():
    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()
    
    cur.execute("""CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, 
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL, 
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user', 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY, 
        name VARCHAR(100) UNIQUE NOT NULL, 
        description TEXT)""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY, 
        title VARCHAR(255) NOT NULL, 
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id), 
        category_id INTEGER REFERENCES categories(id),
        status VARCHAR(20) DEFAULT 'draft', 
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY, 
        content TEXT NOT NULL,
        article_id INTEGER REFERENCES articles(id), 
        user_id INTEGER REFERENCES users(id),
        parent_id INTEGER REFERENCES comments(id), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS comment_likes (
        id SERIAL PRIMARY KEY, 
        user_id INTEGER REFERENCES users(id),
        comment_id INTEGER REFERENCES comments(id), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, comment_id))""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS saved_articles (
        id SERIAL PRIMARY KEY, 
        user_id INTEGER REFERENCES users(id),
        article_id INTEGER REFERENCES articles(id), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, article_id))""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS followers (
        id SERIAL PRIMARY KEY, 
        follower_id INTEGER REFERENCES users(id),
        following_id INTEGER REFERENCES users(id), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id))""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY, 
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL, 
        message TEXT NOT NULL, 
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS article_likes (
        id SERIAL PRIMARY KEY, 
        user_id INTEGER REFERENCES users(id),
        article_id INTEGER REFERENCES articles(id), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, article_id))""")
    
    cur.execute("""CREATE TABLE IF NOT EXISTS password_reset_otps (
        id SERIAL PRIMARY KEY, 
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL, 
        is_used BOOLEAN DEFAULT FALSE)""")
    
    default_categories = [
        ('Frontend','Frontend development'),
        ('Backend','Backend development'),
        ('Database','Database design'),
        ('DevOps','DevOps practices'),
        ('AI','Artificial Intelligence'),
        ('Python','Python programming'),
        ('React','React library'),
        ('PostgreSQL','PostgreSQL database')
    ]
    for name, desc in default_categories:
        cur.execute("INSERT INTO categories (name, description) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING", (name, desc))
    
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Database initialized!")

init_db()

# ============================================================
# TOKEN REQUIRED
# ============================================================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').split(' ')[-1] if request.headers.get('Authorization') else None
        if not token:
            return jsonify({'error': 'Token missing!'}), 401
        try:
            data = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'supersecretkey123'), algorithms=['HS256'])
            return f(data['user_id'], *args, **kwargs)
        except:
            return jsonify({'error': 'Invalid token!'}), 401
    return decorated

# ============================================================
# SEND EMAIL
# ============================================================
def send_email(to_email, subject, html_body):
    try:
        from_email = os.getenv('MAIL_USERNAME')
        password = os.getenv('MAIL_PASSWORD')
        if not from_email or not password: 
            print("❌ Email credentials missing!")
            return False
        msg = MIMEMultipart('alternative')
        msg['Subject'], msg['From'], msg['To'] = subject, from_email, to_email
        msg.attach(MIMEText(html_body, 'html'))
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(from_email, password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        print("✅ Email sent successfully!")
        return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

# ============================================================
# NOTIFICATIONS HELPERS
# ============================================================
def create_notification(user_id, type, message, link):
    try:
        conn = get_db_connection()
        if not conn: return
        cur = conn.cursor()
        cur.execute("INSERT INTO notifications (user_id, type, message, link) VALUES (%s, %s, %s, %s)", 
                   (user_id, type, message, link))
        conn.commit()
        cur.close()
        conn.close()
    except:
        pass

def notify_followers(author_id, article_id, title):
    try:
        conn = get_db_connection()
        if not conn: return
        cur = conn.cursor()
        cur.execute("SELECT name FROM users WHERE id = %s", (author_id,))
        author = cur.fetchone()
        if not author: return
        cur.execute("SELECT follower_id FROM followers WHERE following_id = %s", (author_id,))
        followers = cur.fetchall()
        for f in followers:
            cur.execute("INSERT INTO notifications (user_id, type, message, link) VALUES (%s, 'new_article', %s, %s)", 
                       (f[0], f"{author[0]} published: {title}", f"/articles/{article_id}"))
        conn.commit()
        cur.close()
        conn.close()
    except:
        pass

# ============================================================
# HEALTH
# ============================================================
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

# ============================================================
# AUTH - REGISTER
# ============================================================
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not all(k in data for k in ['name','email','password']):
            return jsonify({'error': 'Missing fields'}), 400
        name, email, password = data['name'].strip(), data['email'].lower().strip(), data['password']
        if len(name) < 2 or not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email) or len(password) < 6:
            return jsonify({'error': 'Invalid input'}), 400
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Email exists'}), 409
        cur.execute("INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email, role, created_at", 
                   (name, email, hashed))
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        token = jwt.encode({'user_id': user[0], 'email': user[2], 'role': user[3], 
                           'exp': datetime.utcnow() + timedelta(days=7)}, 
                          os.getenv('JWT_SECRET_KEY', 'supersecretkey123'))
        return jsonify({
            'message': 'Registered',
            'token': token,
            'user': {'id': user[0], 'name': user[1], 'email': user[2], 'role': user[3]}
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# AUTH - LOGIN
# ============================================================
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400
        email, password = data['email'].lower().strip(), data['password']
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, password_hash, role FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if not user or not bcrypt.checkpw(password.encode(), user[3].encode()):
            return jsonify({'error': 'Invalid credentials'}), 401
        token = jwt.encode({'user_id': user[0], 'email': user[2], 'role': user[4], 
                           'exp': datetime.utcnow() + timedelta(days=7)}, 
                          os.getenv('JWT_SECRET_KEY', 'supersecretkey123'))
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {'id': user[0], 'name': user[1], 'email': user[2], 'role': user[4]}
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# FORGOT PASSWORD - SEND OTP
# ============================================================
@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        
        if not email:
            return jsonify({'error': 'Email required'}), 400
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
            
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return jsonify({'error': 'No account found with this email'}), 404
        
        otp = ''.join(random.choices('0123456789', k=6))
        print(f"🔑 Generated OTP: {otp} for {email}")
        
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=10)
        
        cur.execute("DELETE FROM password_reset_otps WHERE email = %s", (email,))
        cur.execute(
            "INSERT INTO password_reset_otps (email, otp, expires_at, is_used) VALUES (%s, %s, %s, %s)",
            (email, otp, expires_at, False)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Password Reset OTP</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; background: #EEF2FF; border-radius: 8px; letter-spacing: 8px; }}
                .expiry {{ color: #6B7280; font-size: 14px; text-align: center; }}
                .footer {{ text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2 style="color: #1F2937; text-align: center;">🔐 Password Reset</h2>
                <p style="color: #4B5563;">Hello {user[1]},</p>
                <p style="color: #4B5563;">You requested to reset your password. Use the following OTP to verify your identity:</p>
                <div class="otp-code">{otp}</div>
                <p class="expiry">⏰ This OTP is valid for <strong>10 minutes</strong></p>
                <hr style="border: 1px solid #E5E7EB;">
                <p style="color: #4B5563; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                <div class="footer">Developer Knowledge Base</div>
            </div>
        </body>
        </html>
        """
        
        success = send_email(email, '🔐 Password Reset OTP', html)
        
        if success:
            return jsonify({
                'message': 'OTP sent successfully! Please check your email.',
                'email': email
            }), 200
        else:
            return jsonify({'error': 'Failed to send email. Please try again.'}), 500
            
    except Exception as e:
        print(f"❌ Forgot password error: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================
# VERIFY OTP
# ============================================================
@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        otp = data.get('otp', '').strip()
        
        if not email or not otp or len(otp) != 6:
            return jsonify({'error': 'Invalid input'}), 400
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
            
        cur = conn.cursor()
        
        now = datetime.utcnow()
        
        cur.execute("""
            SELECT id, email, otp, expires_at, is_used 
            FROM password_reset_otps 
            WHERE email = %s AND otp = %s AND is_used = FALSE
            ORDER BY created_at DESC LIMIT 1
        """, (email, otp))
        
        record = cur.fetchone()
        
        if not record:
            cur.close()
            conn.close()
            return jsonify({'error': 'Invalid OTP'}), 400
            
        if record[3] < now:
            cur.close()
            conn.close()
            return jsonify({'error': 'OTP has expired'}), 400
            
        cur.execute("UPDATE password_reset_otps SET is_used = TRUE WHERE id = %s", (record[0],))
        conn.commit()
        cur.close()
        conn.close()
        
        reset_token = jwt.encode(
            {'email': email, 'type': 'password_reset', 'exp': datetime.utcnow() + timedelta(minutes=15)},
            os.getenv('JWT_SECRET_KEY', 'supersecretkey123')
        )
        
        return jsonify({
            'message': 'OTP verified successfully!',
            'reset_token': reset_token
        }), 200
        
    except Exception as e:
        print(f"❌ Verify OTP error: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================
# RESET PASSWORD
# ============================================================
@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        reset_token = data.get('reset_token')
        new_password = data.get('new_password')
        
        if not reset_token or not new_password or len(new_password) < 6:
            return jsonify({'error': 'Invalid input'}), 400
            
        try:
            payload = jwt.decode(reset_token, os.getenv('JWT_SECRET_KEY', 'supersecretkey123'), algorithms=['HS256'])
            email = payload.get('email')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Reset token expired'}), 400
        except Exception as e:
            return jsonify({'error': 'Invalid reset token'}), 400
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
            
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
            
        hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed, email))
        cur.execute("DELETE FROM password_reset_otps WHERE email = %s", (email,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Password reset successfully!'}), 200
        
    except Exception as e:
        print(f"❌ Reset password error: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================
# GENERATE PASSWORD
# ============================================================
@app.route('/api/auth/generate-password', methods=['GET'])
def generate_password():
    password = ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%^&*") for _ in range(12))
    return jsonify({'password': password}), 200

# ============================================================
# GET CATEGORIES
# ============================================================
@app.route('/api/categories', methods=['GET'])
@token_required
def get_categories(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT id, name, description FROM categories ORDER BY name")
    cats = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'categories': [{'id': c[0], 'name': c[1], 'description': c[2]} for c in cats]
    })

# ============================================================
# CREATE ARTICLE
# ============================================================
@app.route('/api/articles', methods=['POST'])
@token_required
def create_article(user_id):
    try:
        data = request.get_json()
        if not all(k in data for k in ['title', 'content', 'category_id']):
            return jsonify({'error': 'Missing fields'}), 400
        title, content, category_id, status = data['title'], data['content'], data['category_id'], data.get('status', 'draft')
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("""INSERT INTO articles (title, content, author_id, category_id, status) 
                       VALUES (%s, %s, %s, %s, %s) RETURNING id, title, content, status, views, created_at, updated_at""", 
                   (title, content, user_id, category_id, status))
        article = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if status == 'published':
            notify_followers(user_id, article[0], title)
        return jsonify({
            'message': 'Article created',
            'article': {
                'id': article[0], 'title': article[1], 'content': article[2],
                'status': article[3], 'views': article[4]
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# GET ARTICLES
# ============================================================
@app.route('/api/articles', methods=['GET'])
@token_required
def get_articles(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("""SELECT a.id, a.title, a.content, a.status, a.views, a.created_at, a.updated_at,
                   u.id as author_id, u.name as author_name, c.id as category_id, c.name as category_name,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) as likes_count,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id AND user_id = %s) as user_liked,
                   (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comments_count
                   FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id
                   WHERE a.status = 'published' ORDER BY a.created_at DESC""", (user_id,))
    articles = cur.fetchall()
    cur.close()
    conn.close()
    result = [{
        'id': a[0], 'title': a[1], 'content': a[2], 'status': a[3], 'views': a[4],
        'created_at': a[5], 'updated_at': a[6],
        'author': {'id': a[7], 'name': a[8]},
        'category': {'id': a[9], 'name': a[10]},
        'likes_count': a[11] or 0,
        'user_liked': bool(a[12]),
        'comments_count': a[13] or 0
    } for a in articles]
    return jsonify({'articles': result})

# ============================================================
# GET MY ARTICLES
# ============================================================
@app.route('/api/articles/my', methods=['GET'])
@token_required
def get_my_articles(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("""SELECT a.id, a.title, a.content, a.status, a.views, a.created_at, a.updated_at,
                   c.id as category_id, c.name as category_name,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) as likes_count
                   FROM articles a LEFT JOIN categories c ON a.category_id = c.id
                   WHERE a.author_id = %s ORDER BY a.created_at DESC""", (user_id,))
    articles = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'articles': [{
            'id': a[0], 'title': a[1], 'content': a[2], 'status': a[3], 'views': a[4],
            'created_at': a[5], 'updated_at': a[6],
            'category': {'id': a[7], 'name': a[8]},
            'likes_count': a[9] or 0
        } for a in articles]
    })

# ============================================================
# GET SINGLE ARTICLE
# ============================================================
@app.route('/api/articles/<int:article_id>', methods=['GET'])
@token_required
def get_article(user_id, article_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("UPDATE articles SET views = views + 1 WHERE id = %s AND status = 'published'", (article_id,))
    conn.commit()
    cur.execute("""SELECT a.id, a.title, a.content, a.status, a.views, a.created_at, a.updated_at,
                   u.id as author_id, u.name as author_name, c.id as category_id, c.name as category_name,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) as likes_count,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id AND user_id = %s) as user_liked,
                   (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comments_count
                   FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id
                   WHERE a.id = %s""", (user_id, article_id))
    a = cur.fetchone()
    cur.close()
    conn.close()
    if not a:
        return jsonify({'error': 'Not found'}), 404
    if a[3] == 'draft' and a[7] != user_id:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'article': {
            'id': a[0], 'title': a[1], 'content': a[2], 'status': a[3], 'views': a[4],
            'created_at': a[5], 'updated_at': a[6],
            'author': {'id': a[7], 'name': a[8]},
            'category': {'id': a[9], 'name': a[10]},
            'likes_count': a[11] or 0,
            'user_liked': bool(a[12]),
            'comments_count': a[13] or 0
        }
    })

# ============================================================
# UPDATE ARTICLE
# ============================================================
@app.route('/api/articles/<int:article_id>', methods=['PUT'])
@token_required
def update_article(user_id, article_id):
    try:
        data = request.get_json()
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("SELECT author_id, status FROM articles WHERE id = %s", (article_id,))
        result = cur.fetchone()
        if not result:
            cur.close()
            conn.close()
            return jsonify({'error': 'Not found'}), 404
        if result[0] != user_id:
            cur.close()
            conn.close()
            return jsonify({'error': 'Permission denied'}), 403
        old_status = result[1]
        updates, params = [], []
        for f in ['title', 'content', 'category_id', 'status']:
            if f in data:
                if f == 'status' and data[f] not in ['draft', 'published']:
                    return jsonify({'error': 'Invalid status'}), 400
                updates.append(f"{f} = %s")
                params.append(data[f])
        if not updates:
            return jsonify({'error': 'No fields'}), 400
        params.append(article_id)
        cur.execute(f"UPDATE articles SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s", params)
        conn.commit()
        if old_status == 'draft' and data.get('status') == 'published':
            cur.execute("SELECT title FROM articles WHERE id = %s", (article_id,))
            title = cur.fetchone()[0]
            notify_followers(user_id, article_id, title)
        cur.close()
        conn.close()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# DELETE ARTICLE
# ============================================================
@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
@token_required
def delete_article(user_id, article_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT author_id FROM articles WHERE id = %s", (article_id,))
    result = cur.fetchone()
    if not result:
        cur.close()
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    if result[0] != user_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Permission denied'}), 403
    cur.execute("DELETE FROM articles WHERE id = %s", (article_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Deleted'}), 200

# ============================================================
# SEARCH ARTICLES
# ============================================================
@app.route('/api/articles/search', methods=['GET'])
@token_required
def search_articles(user_id):
    q = request.args.get('q', '')
    if not q:
        return jsonify({'error': 'Query required'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("""SELECT a.id, a.title, a.content, a.status, a.views, a.created_at, a.updated_at,
                   u.id as author_id, u.name as author_name, c.id as category_id, c.name as category_name,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) as likes_count
                   FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id
                   WHERE a.status = 'published' AND (a.title ILIKE %s OR a.content ILIKE %s OR c.name ILIKE %s)
                   ORDER BY a.created_at DESC""", (f'%{q}%', f'%{q}%', f'%{q}%'))
    articles = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'articles': [{
            'id': a[0], 'title': a[1], 'content': a[2], 'status': a[3], 'views': a[4],
            'created_at': a[5], 'updated_at': a[6],
            'author': {'id': a[7], 'name': a[8]},
            'category': {'id': a[9], 'name': a[10]},
            'likes_count': a[11] or 0
        } for a in articles]
    })

# ============================================================
# ARTICLE LIKE
# ============================================================
@app.route('/api/articles/<int:article_id>/like', methods=['POST'])
@token_required
def like_article(user_id, article_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT author_id FROM articles WHERE id = %s", (article_id,))
    author = cur.fetchone()
    if not author:
        cur.close()
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    cur.execute("SELECT id FROM article_likes WHERE user_id = %s AND article_id = %s", (user_id, article_id))
    if cur.fetchone():
        cur.execute("DELETE FROM article_likes WHERE user_id = %s AND article_id = %s", (user_id, article_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Unliked', 'liked': False}), 200
    cur.execute("INSERT INTO article_likes (user_id, article_id) VALUES (%s, %s)", (user_id, article_id))
    if author[0] != user_id:
        cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
        name = cur.fetchone()[0]
        cur.execute("INSERT INTO notifications (user_id, type, message, link) VALUES (%s, 'like', %s, %s)", 
                   (author[0], f"{name} liked your article", f"/articles/{article_id}"))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Liked', 'liked': True}), 200

# ============================================================
# COMMENTS - GET
# ============================================================
@app.route('/api/articles/<int:article_id>/comments', methods=['GET'])
@token_required
def get_comments(user_id, article_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("""SELECT c.id, c.content, c.created_at, u.id as user_id, u.name as user_name, c.parent_id,
                   (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
                   (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = %s) as user_liked
                   FROM comments c JOIN users u ON c.user_id = u.id WHERE c.article_id = %s ORDER BY c.created_at ASC""", 
               (user_id, article_id))
    comments = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'comments': [{
            'id': c[0], 'content': c[1], 'created_at': c[2],
            'user': {'id': c[3], 'name': c[4]},
            'parent_id': c[5],
            'likes_count': c[6] or 0,
            'user_liked': bool(c[7])
        } for c in comments]
    })

# ============================================================
# ADD COMMENT
# ============================================================
@app.route('/api/comments', methods=['POST'])
@token_required
def add_comment(user_id):
    try:
        data = request.get_json()
        if not data.get('content') or not data.get('article_id'):
            return jsonify({'error': 'Missing fields'}), 400
        content, article_id, parent_id = data['content'].strip(), data['article_id'], data.get('parent_id')
        if len(content) < 1:
            return jsonify({'error': 'Empty comment'}), 400
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("SELECT id, author_id FROM articles WHERE id = %s", (article_id,))
        article = cur.fetchone()
        if not article:
            cur.close()
            conn.close()
            return jsonify({'error': 'Not found'}), 404
        cur.execute("INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (%s, %s, %s, %s) RETURNING id, content, created_at", 
                   (content, article_id, user_id, parent_id))
        comment = cur.fetchone()
        conn.commit()
        cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
        name = cur.fetchone()[0]
        if article[1] != user_id:
            cur.execute("INSERT INTO notifications (user_id, type, message, link) VALUES (%s, 'comment', %s, %s)", 
                       (article[1], f"{name} commented: {content[:50]}...", f"/articles/{article_id}"))
        if parent_id:
            cur.execute("SELECT user_id FROM comments WHERE id = %s", (parent_id,))
            parent = cur.fetchone()
            if parent and parent[0] != user_id and parent[0] != article[1]:
                cur.execute("INSERT INTO notifications (user_id, type, message, link) VALUES (%s, 'reply', %s, %s)", 
                           (parent[0], f"{name} replied: {content[:50]}...", f"/articles/{article_id}"))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            'message': 'Comment added',
            'comment': {
                'id': comment[0], 'content': comment[1], 'created_at': comment[2],
                'user': {'id': user_id, 'name': name},
                'parent_id': parent_id,
                'likes_count': 0,
                'user_liked': False
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# COMMENT LIKE
# ============================================================
@app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
@token_required
def like_comment(user_id, comment_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM comments WHERE id = %s", (comment_id,))
    comment = cur.fetchone()
    if not comment:
        cur.close()
        conn.close()
        return jsonify({'error': 'Comment not found'}), 404
    cur.execute("SELECT id FROM comment_likes WHERE user_id = %s AND comment_id = %s", (user_id, comment_id))
    if cur.fetchone():
        cur.execute("DELETE FROM comment_likes WHERE user_id = %s AND comment_id = %s", (user_id, comment_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Unliked', 'liked': False}), 200
    cur.execute("INSERT INTO comment_likes (user_id, comment_id) VALUES (%s, %s)", (user_id, comment_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Liked', 'liked': True}), 200

# ============================================================
# DELETE COMMENT
# ============================================================
@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@token_required
def delete_comment(user_id, comment_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM comments WHERE id = %s", (comment_id,))
    result = cur.fetchone()
    if not result:
        cur.close()
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    if result[0] != user_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Permission denied'}), 403
    cur.execute("DELETE FROM comments WHERE id = %s OR parent_id = %s", (comment_id, comment_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Deleted'}), 200

# ============================================================
# SAVE ARTICLE
# ============================================================
@app.route('/api/saved-articles', methods=['POST'])
@token_required
def save_article(user_id):
    data = request.get_json()
    article_id = data.get('article_id')
    if not article_id:
        return jsonify({'error': 'Article ID required'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT id FROM articles WHERE id = %s", (article_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    cur.execute("SELECT id FROM saved_articles WHERE user_id = %s AND article_id = %s", (user_id, article_id))
    if cur.fetchone():
        cur.execute("DELETE FROM saved_articles WHERE user_id = %s AND article_id = %s", (user_id, article_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Unsaved', 'saved': False}), 200
    cur.execute("INSERT INTO saved_articles (user_id, article_id) VALUES (%s, %s)", (user_id, article_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Saved', 'saved': True}), 201

# ============================================================
# GET SAVED ARTICLES
# ============================================================
@app.route('/api/saved-articles', methods=['GET'])
@token_required
def get_saved_articles(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("""SELECT a.id, a.title, a.content, a.status, a.views, a.created_at, a.updated_at,
                   u.id as author_id, u.name as author_name, c.id as category_id, c.name as category_name,
                   s.created_at as saved_at, (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) as likes_count
                   FROM saved_articles s JOIN articles a ON s.article_id = a.id
                   LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id
                   WHERE s.user_id = %s ORDER BY s.created_at DESC""", (user_id,))
    articles = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'saved_articles': [{
            'id': a[0], 'title': a[1], 'content': a[2], 'status': a[3], 'views': a[4],
            'created_at': a[5], 'updated_at': a[6],
            'author': {'id': a[7], 'name': a[8]},
            'category': {'id': a[9], 'name': a[10]},
            'saved_at': a[11],
            'likes_count': a[12] or 0
        } for a in articles]
    })

# ============================================================
# CHECK SAVED
# ============================================================
@app.route('/api/saved-articles/<int:article_id>', methods=['GET'])
@token_required
def check_saved(user_id, article_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT id FROM saved_articles WHERE user_id = %s AND article_id = %s", (user_id, article_id))
    saved = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({'saved': bool(saved)}), 200

# ============================================================
# FOLLOW - FOLLOW USER
# ============================================================
@app.route('/api/follow/<int:user_id>', methods=['POST'])
@token_required
def follow_user(current_user_id, user_id):
    if current_user_id == user_id:
        return jsonify({'error': 'Cannot follow yourself'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close()
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    cur.execute("SELECT id FROM followers WHERE follower_id = %s AND following_id = %s", (current_user_id, user_id))
    if cur.fetchone():
        cur.execute("DELETE FROM followers WHERE follower_id = %s AND following_id = %s", (current_user_id, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Unfollowed', 'following': False}), 200
    cur.execute("INSERT INTO followers (follower_id, following_id) VALUES (%s, %s)", (current_user_id, user_id))
    cur.execute("SELECT name FROM users WHERE id = %s", (current_user_id,))
    name = cur.fetchone()[0]
    cur.execute("INSERT INTO notifications (user_id, type, message, link) VALUES (%s, 'follow', %s, %s)", 
               (user_id, f"{name} started following you", f"/profile/{current_user_id}"))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Followed', 'following': True}), 200

# ============================================================
# CHECK FOLLOW
# ============================================================
@app.route('/api/follow/check/<int:user_id>', methods=['GET'])
@token_required
def check_follow(current_user_id, user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT id FROM followers WHERE follower_id = %s AND following_id = %s", (current_user_id, user_id))
    following = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({'following': bool(following)}), 200

# ============================================================
# FOLLOWING ARTICLES
# ============================================================
@app.route('/api/following-articles', methods=['GET'])
@token_required
def get_following_articles(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM followers WHERE follower_id = %s", (user_id,))
    if cur.fetchone()[0] == 0:
        cur.close()
        conn.close()
        return jsonify({'articles': []}), 200
    cur.execute("""SELECT a.id, a.title, a.content, a.status, a.views, a.created_at, a.updated_at,
                   u.id as author_id, u.name as author_name, c.id as category_id, c.name as category_name,
                   (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) as likes_count
                   FROM articles a JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id
                   WHERE a.status = 'published' AND a.author_id IN (SELECT following_id FROM followers WHERE follower_id = %s)
                   ORDER BY a.created_at DESC""", (user_id,))
    articles = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'articles': [{
            'id': a[0], 'title': a[1], 'content': a[2], 'status': a[3], 'views': a[4],
            'created_at': a[5], 'updated_at': a[6],
            'author': {'id': a[7], 'name': a[8]},
            'category': {'id': a[9], 'name': a[10]},
            'likes_count': a[11] or 0
        } for a in articles]
    })

# ============================================================
# NOTIFICATIONS - UNREAD COUNT
# ============================================================
@app.route('/api/notifications/unread-count', methods=['GET'])
@token_required
def get_unread_count(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,))
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return jsonify({'unread_count': count}), 200

# ============================================================
# NOTIFICATIONS - GET ALL
# ============================================================
@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("""
        SELECT id, type, message, link, is_read, 
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        FROM notifications 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT 50
    """, (user_id,))
    notifs = cur.fetchall()
    cur.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE", (user_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({
        'notifications': [{
            'id': n[0], 'type': n[1], 'message': n[2], 'link': n[3],
            'is_read': n[4], 'created_at': n[5]
        } for n in notifs]
    })

# ============================================================
# NOTIFICATIONS - MARK READ
# ============================================================
@app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(user_id, notif_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s RETURNING id", (notif_id, user_id))
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not result:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Marked read'}), 200

# ============================================================
# NOTIFICATIONS - MARK ALL READ
# ============================================================
@app.route('/api/notifications/read-all', methods=['PUT'])
@token_required
def mark_all_read(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,))
    count = cur.fetchone()[0]
    if count == 0:
        cur.close()
        conn.close()
        return jsonify({'message': 'No unread'}), 200
    cur.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE", (user_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'All marked read', 'count': count}), 200

# ============================================================
# GET USER PROFILE
# ============================================================
@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_profile(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, role, created_at FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'user': {
            'id': user[0], 'name': user[1], 'email': user[2],
            'role': user[3], 'created_at': user[4]
        }
    })

# ============================================================
# UPDATE USER PROFILE
# ============================================================
@app.route('/api/users/profile', methods=['PUT'])
@token_required
def update_profile(user_id):
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        if len(name) < 2:
            return jsonify({'error': 'Name too short'}), 400
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("UPDATE users SET name = %s WHERE id = %s RETURNING id, name, email, role, created_at", (name, user_id))
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            'message': 'Profile updated',
            'user': {
                'id': user[0], 'name': user[1], 'email': user[2],
                'role': user[3], 'created_at': user[4]
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# PDF DOWNLOAD
# ============================================================
@app.route('/api/articles/<int:article_id>/download/pdf', methods=['GET'])
@token_required
def download_pdf(user_id, article_id):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        import io
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB error'}), 500
        cur = conn.cursor()
        cur.execute("SELECT a.title, a.content, a.created_at, u.name FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = %s AND a.status = 'published'", (article_id,))
        article = cur.fetchone()
        cur.close()
        conn.close()
        if not article:
            return jsonify({'error': 'Not found'}), 404
            
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], 
                                    fontSize=24, textColor=colors.HexColor('#0d6efd'), spaceAfter=12)
        author_style = ParagraphStyle('CustomAuthor', parent=styles['Normal'], 
                                     fontSize=12, textColor=colors.grey, spaceAfter=6)
        content_style = ParagraphStyle('CustomContent', parent=styles['Normal'], 
                                      fontSize=11, leading=14, spaceAfter=6)
        
        story = [
            Paragraph(article[0], title_style),
            Spacer(1, 0.1*inch),
            Paragraph(f"<b>Author:</b> {article[3]}", author_style),
            Paragraph(f"<b>Date:</b> {article[2].strftime('%B %d, %Y')}", author_style),
            Spacer(1, 0.2*inch)
        ]
        
        for line in article[1].split('\n'):
            story.append(Paragraph(line, content_style) if line.strip() else Spacer(1, 0.1*inch))
            
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("© Developer Knowledge Base", 
                              ParagraphStyle('Footer', parent=styles['Normal'], 
                                            fontSize=9, textColor=colors.grey, alignment=1)))
        doc.build(story)
        pdf = buffer.getvalue()
        buffer.close()
        
        response = make_response(pdf)
        response.headers['Content-Disposition'] = f'attachment; filename="{article[0]}.pdf"'
        response.headers['Content-Type'] = 'application/pdf'
        return response
    except ImportError:
        return jsonify({'error': 'Install reportlab: pip install reportlab'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# ⭐ REGISTER AI CHAT ROUTE (imported from ai_chat.py)
# ============================================================
register_ai_chat_route(app, get_db_connection, token_required, OLLAMA_MODEL)
# ============================================================
# SEND EMAIL (MAILHOG – LOCAL DEVELOPMENT)
# ============================================================
def send_email(to_email, subject, html_body):
    try:
        # MailHog SMTP server – no auth, no TLS
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = "devkb@localhost"   # any sender works with MailHog
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html'))

        # Connect to MailHog on port 1025
        server = smtplib.SMTP('localhost', 1025)
        # No starttls(), no login()
        server.sendmail("devkb@localhost", to_email, msg.as_string())
        server.quit()

        print(f"✅ Email sent to MailHog (to: {to_email})")
        return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

# ============================================================
# RUN
# ============================================================
if __name__ == '__main__':
    app.run(debug=True, port=5000)