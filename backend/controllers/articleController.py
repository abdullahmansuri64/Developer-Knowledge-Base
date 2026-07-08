from flask import request, jsonify
from config.db import get_db_connection
from datetime import datetime

def create_article(current_user_id):
    """Create a new article"""
    try:
        data = request.get_json()
        
        required_fields = ['title', 'content', 'category_id']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        title = data['title']
        content = data['content']
        category_id = data['category_id']
        status = data.get('status', 'draft')
        
        if status not in ['draft', 'published']:
            return jsonify({'error': 'Invalid status'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            
            # Verify category exists
            cur.execute("SELECT id FROM categories WHERE id = %s", (category_id,))
            if not cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({'error': 'Category not found'}), 404
            
            # Create article
            cur.execute("""
                INSERT INTO articles (title, content, author_id, category_id, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, title, content, status, views, created_at, updated_at
            """, (title, content, current_user_id, category_id, status))
            
            article = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({
                'message': 'Article created successfully',
                'article': {
                    'id': article[0],
                    'title': article[1],
                    'content': article[2],
                    'status': article[3],
                    'views': article[4],
                    'created_at': article[5].isoformat() if article[5] else None,
                    'updated_at': article[6].isoformat() if article[6] else None
                }
            }), 201
            
        except Exception as e:
            conn.rollback()
            print(f"Create article error: {e}")
            return jsonify({'error': 'Failed to create article'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Create article error: {e}")
        return jsonify({'error': 'Failed to create article'}), 500

def get_articles(current_user_id):
    """Get all articles"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT a.id, a.title, a.content, a.status, a.views,
                       a.created_at, a.updated_at,
                       u.id as author_id, u.name as author_name,
                       c.id as category_id, c.name as category_name
                FROM articles a
                LEFT JOIN users u ON a.author_id = u.id
                LEFT JOIN categories c ON a.category_id = c.id
                WHERE a.status = 'published'
                ORDER BY a.created_at DESC
            """)
            
            articles = cur.fetchall()
            cur.close()
            conn.close()
            
            result = []
            for article in articles:
                result.append({
                    'id': article[0],
                    'title': article[1],
                    'content': article[2],
                    'status': article[3],
                    'views': article[4],
                    'created_at': article[5].isoformat() if article[5] else None,
                    'updated_at': article[6].isoformat() if article[6] else None,
                    'author': {
                        'id': article[7],
                        'name': article[8]
                    },
                    'category': {
                        'id': article[9],
                        'name': article[10]
                    }
                })
            
            return jsonify({'articles': result}), 200
            
        except Exception as e:
            print(f"Get articles error: {e}")
            return jsonify({'error': 'Failed to fetch articles'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Get articles error: {e}")
        return jsonify({'error': 'Failed to fetch articles'}), 500

def get_my_articles(current_user_id):
    """Get current user's articles"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT a.id, a.title, a.content, a.status, a.views,
                       a.created_at, a.updated_at,
                       c.id as category_id, c.name as category_name
                FROM articles a
                LEFT JOIN categories c ON a.category_id = c.id
                WHERE a.author_id = %s
                ORDER BY a.created_at DESC
            """, (current_user_id,))
            
            articles = cur.fetchall()
            cur.close()
            conn.close()
            
            result = []
            for article in articles:
                result.append({
                    'id': article[0],
                    'title': article[1],
                    'content': article[2],
                    'status': article[3],
                    'views': article[4],
                    'created_at': article[5].isoformat() if article[5] else None,
                    'updated_at': article[6].isoformat() if article[6] else None,
                    'category': {
                        'id': article[7],
                        'name': article[8]
                    }
                })
            
            return jsonify({'articles': result}), 200
            
        except Exception as e:
            print(f"Get my articles error: {e}")
            return jsonify({'error': 'Failed to fetch articles'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Get my articles error: {e}")
        return jsonify({'error': 'Failed to fetch articles'}), 500

def get_article(current_user_id, article_id):
    """Get a single article by ID"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            
            # Get article and increment views
            cur.execute("""
                UPDATE articles 
                SET views = views + 1 
                WHERE id = %s AND status = 'published'
                RETURNING id
            """, (article_id,))
            
            if not cur.fetchone():
                # Check if article exists but is draft
                cur.execute("""
                    SELECT id FROM articles 
                    WHERE id = %s AND author_id = %s
                """, (article_id, current_user_id))
                
                if not cur.fetchone():
                    cur.close()
                    conn.close()
                    return jsonify({'error': 'Article not found'}), 404
            else:
                conn.commit()
            
            # Get article details
            cur.execute("""
                SELECT a.id, a.title, a.content, a.status, a.views,
                       a.created_at, a.updated_at,
                       u.id as author_id, u.name as author_name,
                       c.id as category_id, c.name as category_name
                FROM articles a
                LEFT JOIN users u ON a.author_id = u.id
                LEFT JOIN categories c ON a.category_id = c.id
                WHERE a.id = %s
            """, (article_id,))
            
            article = cur.fetchone()
            cur.close()
            conn.close()
            
            if not article:
                return jsonify({'error': 'Article not found'}), 404
            
            # Check if user can view draft
            if article[3] == 'draft' and article[7] != current_user_id:
                return jsonify({'error': 'Article not found'}), 404
            
            return jsonify({
                'article': {
                    'id': article[0],
                    'title': article[1],
                    'content': article[2],
                    'status': article[3],
                    'views': article[4],
                    'created_at': article[5].isoformat() if article[5] else None,
                    'updated_at': article[6].isoformat() if article[6] else None,
                    'author': {
                        'id': article[7],
                        'name': article[8]
                    },
                    'category': {
                        'id': article[9],
                        'name': article[10]
                    }
                }
            }), 200
            
        except Exception as e:
            print(f"Get article error: {e}")
            return jsonify({'error': 'Failed to fetch article'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Get article error: {e}")
        return jsonify({'error': 'Failed to fetch article'}), 500

def update_article(current_user_id, article_id):
    """Update an article"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            
            # Verify ownership
            cur.execute("SELECT author_id FROM articles WHERE id = %s", (article_id,))
            result = cur.fetchone()
            
            if not result:
                cur.close()
                conn.close()
                return jsonify({'error': 'Article not found'}), 404
            
            if result[0] != current_user_id:
                cur.close()
                conn.close()
                return jsonify({'error': 'You do not have permission to edit this article'}), 403
            
            # Build update query
            updates = []
            params = []
            
            if 'title' in data:
                updates.append("title = %s")
                params.append(data['title'])
            
            if 'content' in data:
                updates.append("content = %s")
                params.append(data['content'])
            
            if 'category_id' in data:
                # Verify category exists
                cur.execute("SELECT id FROM categories WHERE id = %s", (data['category_id'],))
                if not cur.fetchone():
                    cur.close()
                    conn.close()
                    return jsonify({'error': 'Category not found'}), 404
                updates.append("category_id = %s")
                params.append(data['category_id'])
            
            if 'status' in data:
                if data['status'] not in ['draft', 'published']:
                    cur.close()
                    conn.close()
                    return jsonify({'error': 'Invalid status'}), 400
                updates.append("status = %s")
                params.append(data['status'])
            
            if not updates:
                cur.close()
                conn.close()
                return jsonify({'error': 'No fields to update'}), 400
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            
            params.append(article_id)
            query = f"UPDATE articles SET {', '.join(updates)} WHERE id = %s RETURNING id"
            
            cur.execute(query, params)
            cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({'message': 'Article updated successfully'}), 200
            
        except Exception as e:
            conn.rollback()
            print(f"Update article error: {e}")
            return jsonify({'error': 'Failed to update article'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Update article error: {e}")
        return jsonify({'error': 'Failed to update article'}), 500

def delete_article(current_user_id, article_id):
    """Delete an article"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            
            # Verify ownership
            cur.execute("SELECT author_id FROM articles WHERE id = %s", (article_id,))
            result = cur.fetchone()
            
            if not result:
                cur.close()
                conn.close()
                return jsonify({'error': 'Article not found'}), 404
            
            if result[0] != current_user_id:
                cur.close()
                conn.close()
                return jsonify({'error': 'You do not have permission to delete this article'}), 403
            
            cur.execute("DELETE FROM articles WHERE id = %s", (article_id,))
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({'message': 'Article deleted successfully'}), 200
            
        except Exception as e:
            conn.rollback()
            print(f"Delete article error: {e}")
            return jsonify({'error': 'Failed to delete article'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Delete article error: {e}")
        return jsonify({'error': 'Failed to delete article'}), 500

def search_articles(current_user_id):
    """Search articles by keyword"""
    try:
        query = request.args.get('q', '')
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT a.id, a.title, a.content, a.status, a.views,
                       a.created_at, a.updated_at,
                       u.id as author_id, u.name as author_name,
                       c.id as category_id, c.name as category_name
                FROM articles a
                LEFT JOIN users u ON a.author_id = u.id
                LEFT JOIN categories c ON a.category_id = c.id
                WHERE a.status = 'published'
                AND (
                    a.title ILIKE %s 
                    OR a.content ILIKE %s
                    OR c.name ILIKE %s
                )
                ORDER BY a.created_at DESC
            """, (f'%{query}%', f'%{query}%', f'%{query}%'))
            
            articles = cur.fetchall()
            cur.close()
            conn.close()
            
            result = []
            for article in articles:
                result.append({
                    'id': article[0],
                    'title': article[1],
                    'content': article[2],
                    'status': article[3],
                    'views': article[4],
                    'created_at': article[5].isoformat() if article[5] else None,
                    'updated_at': article[6].isoformat() if article[6] else None,
                    'author': {
                        'id': article[7],
                        'name': article[8]
                    },
                    'category': {
                        'id': article[9],
                        'name': article[10]
                    }
                })
            
            return jsonify({'articles': result}), 200
            
        except Exception as e:
            print(f"Search articles error: {e}")
            return jsonify({'error': 'Failed to search articles'}), 500
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Search articles error: {e}")
        return jsonify({'error': 'Failed to search articles'}), 500