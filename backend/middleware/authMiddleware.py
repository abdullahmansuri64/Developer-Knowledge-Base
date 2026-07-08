import jwt
from functools import wraps
from flask import request, jsonify, current_app
import os

def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            # Decode token
            secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
            data = jwt.decode(token, secret_key, algorithms=['HS256'])
            current_user = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated