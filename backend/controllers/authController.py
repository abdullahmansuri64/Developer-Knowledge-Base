from flask import request, jsonify
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from config.db import get_db_connection

def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['name', 'email', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        name = data['name']
        email = data['email'].lower()
        password = data['password']
        
        # Hash password
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            
            # Check if user exists
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({'error': 'Email already registered'}), 409
            
            # Insert new user
            cur.execute("""
                INSERT INTO users (name, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, name, email, role, created_at
            """, (name, email, password_hash))
            
            user = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({
                'message': 'User registered successfully',
                'user': {
                    'id': user[0],
                    'name': user[1],
                    'email': user[2],
                    'role': user[3],
                    'created_at': user[4].isoformat() if user[4] else None
                }
            }), 201
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

def login():
    """Login user and return JWT token"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400
        
        email = data['email'].lower()
        password = data['password']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, name, email, password_hash, role
                FROM users WHERE email = %s
            """, (email,))
            
            user = cur.fetchone()
            cur.close()
            conn.close()
            
            if not user:
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Generate JWT token
            secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
            token = jwt.encode({
                'user_id': user[0],
                'email': user[2],
                'role': user[4],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, secret_key, algorithm='HS256')
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': user[0],
                    'name': user[1],
                    'email': user[2],
                    'role': user[4]
                }
            }), 200
            
        except Exception as e:
            print(f"Login error: {e}")
            return jsonify({'error': 'Login failed'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500