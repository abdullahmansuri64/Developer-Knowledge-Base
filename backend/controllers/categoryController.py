from flask import request, jsonify
from config.db import get_db_connection

def get_categories():
    """Get all categories"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, name, description
                FROM categories
                ORDER BY name
            """)
            
            categories = cur.fetchall()
            cur.close()
            conn.close()
            
            result = []
            for category in categories:
                # Get article count for each category
                count_cur = conn.cursor()
                count_cur.execute("""
                    SELECT COUNT(*) FROM articles 
                    WHERE category_id = %s AND status = 'published'
                """, (category[0],))
                count = count_cur.fetchone()[0]
                count_cur.close()
                
                result.append({
                    'id': category[0],
                    'name': category[1],
                    'description': category[2],
                    'article_count': count
                })
            
            return jsonify({'categories': result}), 200
            
        except Exception as e:
            print(f"Get categories error: {e}")
            return jsonify({'error': 'Failed to fetch categories'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Get categories error: {e}")
        return jsonify({'error': 'Failed to fetch categories'}), 500