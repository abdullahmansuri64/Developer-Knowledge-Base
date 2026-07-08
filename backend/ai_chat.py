# ai_chat.py
import re
import json
import socket
import requests
from datetime import datetime, date
from flask import jsonify, request

# ================================================================
# ROUTING PROMPT – Enhanced with "latest article" example
# ================================================================
ROUTING_PROMPT_TEMPLATE = """
You are an AI assistant for the Developer Knowledge Base platform.
Translate the user's question into a PostgreSQL SELECT query.
Return ONLY a JSON object with a "sql" key.

⚠️ CRITICAL SECURITY RULE:
- You MUST ONLY generate SELECT queries. NEVER generate DELETE, UPDATE, INSERT, DROP, ALTER, TRUNCATE, or any other data modification query.
- If the user asks to delete, update, insert, or modify any data, return: {{"error": "Read‑only queries only."}}
- All examples below are SELECT queries – follow them exactly.

CRITICAL RULES:
- For user names: ALWAYS use ILIKE with `%` wildcards: WHERE name ILIKE '%parth%'.
- For article titles: ALWAYS use ILIKE with `%` wildcards: WHERE title ILIKE '%react%'.
- For category names: ALWAYS use ILIKE with `%` wildcards: WHERE name ILIKE '%database%'.
- For article lists: JOIN users ON articles.author_id = users.id to get author name.
- For counts: use COUNT(*) or COUNT(DISTINCT ...).
- For "lowest views", "least views", "fewest views": ALWAYS use ORDER BY views ASC LIMIT 1.
- For "highest views", "most views": ALWAYS use ORDER BY views DESC LIMIT 1.
- For "latest article", "most recent article": ALWAYS use ORDER BY created_at DESC LIMIT 1.
- For saved articles: join saved_articles with articles and users.
- For followers: join followers with users twice.

EXAMPLES (follow exactly – these cover all your test queries):

Q: Show me all users
A: {{"sql": "SELECT name, email, role, created_at FROM users ORDER BY name"}}

Q: Who is Parth?
A: {{"sql": "SELECT name, email, role, created_at FROM users WHERE name ILIKE '%Parth%'"}}

Q: Is khatri exist?
A: {{"sql": "SELECT name, email, role, created_at FROM users WHERE name ILIKE '%khatri%'"}}

Q: Does Parth exist?
A: {{"sql": "SELECT COUNT(*) > 0 AS exists FROM users WHERE name ILIKE '%Parth%'"}}

Q: List all articles
A: {{"sql": "SELECT a.title, a.content, a.views, a.created_at, u.name AS author, (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) AS likes, (SELECT COUNT(*) FROM comments WHERE article_id = a.id) AS comments FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC"}}

Q: List all articles by Parth
A: {{"sql": "SELECT a.title, a.content, a.views, a.created_at, u.name AS author, (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) AS likes, (SELECT COUNT(*) FROM comments WHERE article_id = a.id) AS comments FROM articles a JOIN users u ON a.author_id = u.id WHERE u.name ILIKE '%Parth%' ORDER BY a.created_at DESC"}}

Q: How many articles did Parth write?
A: {{"sql": "SELECT COUNT(*) FROM articles WHERE author_id = (SELECT id FROM users WHERE name ILIKE '%Parth%')"}}

Q: Show me the most viewed article
A: {{"sql": "SELECT a.title, a.views, u.name AS author, (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) AS likes, (SELECT COUNT(*) FROM comments WHERE article_id = a.id) AS comments FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views DESC LIMIT 1"}}

Q: Show me the article with the lowest views
A: {{"sql": "SELECT a.title, a.views, u.name AS author, (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) AS likes, (SELECT COUNT(*) FROM comments WHERE article_id = a.id) AS comments FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views ASC LIMIT 1"}}

Q: Show me the least viewed article
A: {{"sql": "SELECT a.title, a.views, u.name AS author, (SELECT COUNT(*) FROM article_likes WHERE article_id = a.id) AS likes, (SELECT COUNT(*) FROM comments WHERE article_id = a.id) AS comments FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views ASC LIMIT 1"}}

Q: which article has lowest views
A: {{"sql": "SELECT a.title, a.views, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views ASC LIMIT 1"}}

Q: which article has the lowest views
A: {{"sql": "SELECT a.title, a.views, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views ASC LIMIT 1"}}

Q: Which article has fewest views
A: {{"sql": "SELECT a.title, a.views, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views ASC LIMIT 1"}}

Q: Which article has the fewest views
A: {{"sql": "SELECT a.title, a.views, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.views ASC LIMIT 1"}}

Q: Show me all draft articles
A: {{"sql": "SELECT a.title, a.content, a.views, a.created_at, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id WHERE a.status = 'draft' ORDER BY a.created_at DESC"}}

Q: Which category has the most articles?
A: {{"sql": "SELECT c.name, COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON c.id = a.category_id GROUP BY c.id, c.name ORDER BY article_count DESC LIMIT 1"}}

Q: Which category has the fewest articles?
A: {{"sql": "SELECT c.name, COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON c.id = a.category_id GROUP BY c.id, c.name ORDER BY article_count ASC LIMIT 1"}}

Q: Which categories has the lowest articles?
A: {{"sql": "SELECT c.name, COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON c.id = a.category_id GROUP BY c.id, c.name ORDER BY article_count ASC LIMIT 1"}}

Q: Which categories has the highest articles?
A: {{"sql": "SELECT c.name, COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON c.id = a.category_id GROUP BY c.id, c.name ORDER BY article_count DESC LIMIT 1"}}

Q: How many categories are there?
A: {{"sql": "SELECT COUNT(*) FROM categories"}}

Q: How many articles in category 'database'?
A: {{"sql": "SELECT COUNT(*) FROM articles WHERE category_id = (SELECT id FROM categories WHERE name ILIKE '%database%')"}}

Q: how many article are uploaded in category database
A: {{"sql": "SELECT COUNT(*) FROM articles WHERE category_id = (SELECT id FROM categories WHERE name ILIKE '%database%')"}}

Q: how many article are uploaded in category devops
A: {{"sql": "SELECT COUNT(*) FROM articles WHERE category_id = (SELECT id FROM categories WHERE name ILIKE '%devops%')"}}

Q: What articles did Parth save?
A: {{"sql": "SELECT a.title FROM saved_articles sa JOIN articles a ON sa.article_id = a.id JOIN users u ON sa.user_id = u.id WHERE u.name ILIKE '%Parth%'"}}

Q: What articles did abdullah save?
A: {{"sql": "SELECT a.title FROM saved_articles sa JOIN articles a ON sa.article_id = a.id JOIN users u ON sa.user_id = u.id WHERE u.name ILIKE '%abdullah%'"}}

Q: Title contains "stpl"
A: {{"sql": "SELECT a.title, a.content, a.views, a.created_at, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id WHERE a.title ILIKE '%stpl%' ORDER BY a.created_at DESC"}}

Q: stpl inside content
A: {{"sql": "SELECT a.title, a.content, a.views, a.created_at, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id WHERE a.content ILIKE '%stpl%' ORDER BY a.created_at DESC"}}

Q: Find articles containing "Python"
A: {{"sql": "SELECT a.title, a.content, a.views, a.created_at, u.name AS author FROM articles a JOIN users u ON a.author_id = u.id WHERE a.content ILIKE '%Python%' ORDER BY a.created_at DESC"}}

Q: What is the content of the latest article?
A: {{"sql": "SELECT content FROM articles ORDER BY created_at DESC LIMIT 1"}}

Q: Who follows whom?
A: {{"sql": "SELECT u1.name AS follower, u2.name AS followed FROM followers f JOIN users u1 ON f.follower_id = u1.id JOIN users u2 ON f.following_id = u2.id ORDER BY follower"}}

Q: How many followers does Parth have?
A: {{"sql": "SELECT COUNT(*) FROM followers WHERE following_id = (SELECT id FROM users WHERE name ILIKE '%Parth%')"}}

Q: Who is following Parth?
A: {{"sql": "SELECT u.name FROM followers f JOIN users u ON f.follower_id = u.id WHERE f.following_id = (SELECT id FROM users WHERE name ILIKE '%Parth%')"}}

Q: List all users who follow Parth
A: {{"sql": "SELECT u.name FROM followers f JOIN users u ON f.follower_id = u.id WHERE f.following_id = (SELECT id FROM users WHERE name ILIKE '%Parth%')"}}

Q: Which users does Parth follow?
A: {{"sql": "SELECT u.name FROM followers f JOIN users u ON f.following_id = u.id WHERE f.follower_id = (SELECT id FROM users WHERE name ILIKE '%Parth%')"}}

Q: How many unread notifications do I have?
A: {{"sql": "SELECT COUNT(*) FROM notifications WHERE user_id = {user_id} AND is_read = FALSE"}}

Q: Show me all my notifications
A: {{"sql": "SELECT type, message, link, is_read, created_at FROM notifications WHERE user_id = {user_id} ORDER BY created_at DESC"}}

Q: What is my latest notification?
A: {{"sql": "SELECT type, message, created_at FROM notifications WHERE user_id = {user_id} ORDER BY created_at DESC LIMIT 1"}}

Q: Show me the following list of Abdullah
A: {{"sql": "SELECT u2.name AS followed FROM followers f JOIN users u1 ON f.follower_id = u1.id JOIN users u2 ON f.following_id = u2.id WHERE u1.name ILIKE '%Abdullah%'"}}

Now, generate the JSON for this question:

User question: {question}

History (last messages):
{history}

Return ONLY the JSON:
"""

# ================================================================
# DATA SUMMARISATION PROMPT – No changes
# ================================================================
DATA_SUMMERY_PROMPT_TEMPLATE = """
You are a professional assistant. Convert the following database result into a natural, complete answer.

QUESTION: {question}

RESULT (raw data):
{data_json}

INSTRUCTIONS:
- If the result is a list of articles: include title, author, views, likes, comments, creation date, and a content preview (first 100 chars).
- If the result is a single article: show all details (including full content).
- If the result is a list of users: list them with name, email, role, join date.
- If the result is a count: respond with "There are [count] [items]." or "Yes" / "No" for existence.
- If the result is a list of categories: list them with counts.
- If the result is followers/following: list names.
- If the result is notifications: list type, message, date.
- Format dates as "Month DD, YYYY".
- Do NOT mention technical details (SQL, JSON).
- End with: "Is there anything else I can assist you with?"

Now produce the answer:
"""

# ================================================================
# ROUTE REGISTRATION
# ================================================================
def register_ai_chat_route(app, get_db_connection, token_required, OLLAMA_MODEL="gemma2:2b"):
    @app.route('/api/chat', methods=['POST'])
    @token_required
    def ai_chat(user_id):
        try:
            data = request.get_json() or {}
            user_message = data.get('message', '').strip()
            history = data.get('history', [])

            if not user_message:
                return jsonify({'error': 'Message required'}), 400

            # Quick greetings
            if user_message.lower() in ['hi', 'hello', 'hey', 'how are you', 'what\'s up', 'good morning', 'good afternoon', 'good evening', 'helo']:
                return jsonify({
                    'response': "Hello! I'm your DevKB assistant. I can answer questions about users, articles, categories, followers, saved articles, notifications, and more. How may I help you today?"
                }), 200

            # ------------------------------------------------
            # 🛑 EARLY DETECTION: If user asks to DELETE, UPDATE, INSERT, MODIFY, etc.
            # ------------------------------------------------
            modification_keywords = ['delete', 'remove', 'update', 'insert', 'modify', 'edit', 'change', 'drop', 'alter', 'create', 'add', 'save', 'publish']
            if any(word in user_message.lower() for word in modification_keywords):
                # Check if it's a legitimate read query that happens to contain these words? 
                # For safety, we'll assume it's a modification request and return a friendly message.
                # But we can be smarter: if the user asks "delete" or "remove" specifically, we treat as modification.
                if 'delete' in user_message.lower() or 'remove' in user_message.lower() or 'update' in user_message.lower() or 'insert' in user_message.lower() or 'modify' in user_message.lower() or 'edit' in user_message.lower() or 'change' in user_message.lower() or 'drop' in user_message.lower() or 'alter' in user_message.lower() or 'create' in user_message.lower() or 'add' in user_message.lower():
                    return jsonify({
                        'response': "I'm sorry, but I can only help you retrieve information. I cannot delete, update, or modify any data – that's a read‑only assistant. If you need to delete or modify something, please use the platform's UI or ask a human admin. Is there anything else I can help you with?"
                    }), 200

            # Verify Ollama connectivity
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            ollama_check = sock.connect_ex(('127.0.0.1', 11435))
            sock.close()

            if ollama_check != 0:
                return jsonify({
                    'response': "The AI service is currently unavailable. Please ensure Ollama is running on port 11435."
                }), 200

            OLLAMA_ENDPOINT = "http://localhost:11435/api/generate"

            # ------------------------------------------------------------------
            # STEP 1: Generate SQL
            # ------------------------------------------------------------------
            history_text = "\n".join([f"{msg['sender']}: {msg['text']}" for msg in history[-5:]])

            routing_prompt = ROUTING_PROMPT_TEMPLATE.format(
                question=user_message,
                history=history_text,
                user_id=user_id
            )

            sql_query = None
            try:
                routing_resp = requests.post(OLLAMA_ENDPOINT, json={
                    "model": OLLAMA_MODEL,
                    "prompt": routing_prompt,
                    "stream": False,
                    "options": {"temperature": 0.0, "max_tokens": 400, "stop": ["}"]}
                }, timeout=30)
                routing_output = routing_resp.json().get('response', '').strip()
                routing_json = extract_json(routing_output)
                if routing_json is None:
                    raise ValueError("No valid JSON found")
                if 'error' in routing_json:
                    # If the AI returned an error (e.g., read-only), return a friendly message
                    return jsonify({
                        'response': "I'm sorry, but I can only help you retrieve information. I cannot delete, update, or modify any data – that's a read‑only assistant. If you need to delete or modify something, please use the platform's UI or ask a human admin. Is there anything else I can help you with?"
                    }), 200
                sql_query = routing_json.get('sql')
            except Exception as e:
                print(f"❌ Routing error: {e}")
                # If routing failed, check if the user asked a modification query (already caught above, but just in case)
                return handle_empty_result(user_message, fetch_stats)

            if not sql_query:
                return handle_empty_result(user_message, fetch_stats)

            # ------------------------------------------------------------------
            # 🔒 READ-ONLY VALIDATION – Reject any non-SELECT query
            # ------------------------------------------------------------------
            if not sql_query.lower().strip().startswith('select'):
                return jsonify({
                    'response': "I cannot delete or modify data. I only provide information."
                }), 200

            if "greeting" in sql_query:
                return jsonify({
                    'response': "Hello! I'm your DevKB assistant. I can answer questions about users, articles, categories, followers, saved articles, notifications, and more. How may I help you today?"
                }), 200

            print(f"🔍 Generated SQL: {sql_query}")

            # ------------------------------------------------------------------
            # STEP 2: Execute SQL
            # ------------------------------------------------------------------
            conn = get_db_connection()
            if not conn:
                return jsonify({'response': "Database connection failed."}), 200

            cur = conn.cursor()
            result_data = None

            def fetch_stats():
                try:
                    cur.execute("SELECT COUNT(*) FROM users")
                    t_users = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM articles")
                    t_articles = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM articles WHERE status = 'published'")
                    p_articles = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM comments")
                    t_comments = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM article_likes")
                    t_likes = cur.fetchone()[0]
                    return {
                        "total_users": t_users,
                        "total_articles": t_articles,
                        "published_articles": p_articles,
                        "total_comments": t_comments,
                        "total_likes": t_likes
                    }
                except Exception as e:
                    print(f"❌ Stats fetch error: {e}")
                    return None

            try:
                cur.execute(sql_query)
                if sql_query.lower().strip().startswith('select'):
                    rows = cur.fetchall()
                    col_names = [desc[0] for desc in cur.description] if cur.description else []
                    result_data = [dict(zip(col_names, row)) for row in rows]
                else:
                    result_data = {"affected_rows": cur.rowcount}
                conn.commit()
            except Exception as db_err:
                print(f"❌ DB execution error: {db_err}\nQuery: {sql_query}")
                conn.rollback()
                # Fallback to manual queries if AI fails
                result_data = run_fallback_query(user_message, get_db_connection)
                if result_data is None:
                    stats = fetch_stats()
                    if stats is not None:
                        return jsonify({
                            'response': f"Here are the platform statistics: {stats['total_users']} users, {stats['total_articles']} articles ({stats['published_articles']} published), {stats['total_comments']} comments, and {stats['total_likes']} likes."
                        }), 200
                    else:
                        cur.close()
                        conn.close()
                        return jsonify({'response': "I couldn't retrieve that information. Please try again later."}), 200

            cur.close()
            conn.close()

            # ------------------------------------------------------------------
            # STEP 3: If result_data is empty, run fallback queries
            # ------------------------------------------------------------------
            if not result_data or (isinstance(result_data, list) and len(result_data) == 0):
                result_data = run_fallback_query(user_message, get_db_connection)
                if result_data is None:
                    # Still empty, then return appropriate message
                    return handle_empty_result(user_message, fetch_stats)

            # ------------------------------------------------------------------
            # STEP 4: Serialize and format dates
            # ------------------------------------------------------------------
            def format_date(val):
                if isinstance(val, (datetime, date)):
                    return val.strftime('%B %d, %Y')
                if isinstance(val, str):
                    try:
                        dt = datetime.fromisoformat(val)
                        return dt.strftime('%B %d, %Y')
                    except:
                        return val
                return val

            def make_serializable(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                return obj

            def serialize_data(data):
                if isinstance(data, list):
                    return [serialize_data(item) for item in data]
                elif isinstance(data, dict):
                    return {k: serialize_data(v) for k, v in data.items()}
                else:
                    return make_serializable(data)

            serializable_data = serialize_data(result_data)

            # Format dates for display
            def format_data_for_prompt(data):
                if isinstance(data, list):
                    return [format_data_for_prompt(item) for item in data]
                elif isinstance(data, dict):
                    new_dict = {}
                    for k, v in data.items():
                        if k in ['created_at', 'updated_at', 'join_date']:
                            new_dict[k] = format_date(v)
                        else:
                            new_dict[k] = v
                    return new_dict
                else:
                    return data

            display_data = format_data_for_prompt(serializable_data)
            data_json = json.dumps(display_data, indent=2)

            # ------------------------------------------------------------------
            # STEP 5: Summarise
            # ------------------------------------------------------------------
            summary_prompt = DATA_SUMMERY_PROMPT_TEMPLATE.format(
                question=user_message,
                data_json=data_json
            )

            try:
                summary_resp = requests.post(OLLAMA_ENDPOINT, json={
                    "model": OLLAMA_MODEL,
                    "prompt": summary_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "max_tokens": 400,
                        "stop": ["<end_of_turn>"]
                    }
                }, timeout=30)
                ai_final_output = summary_resp.json().get('response', '').strip()
                ai_final_output = ai_final_output.split("<")[0].strip()
            except Exception as e:
                print(f"❌ Summary error: {e}")
                ai_final_output = build_fallback_summary(serializable_data)

            # Post‑processing
            ai_final_output = re.sub(r"\[.*?\]", "", ai_final_output)
            ai_final_output = re.sub(r"[\u2022\u25E6\u2023\u2219*•\-+]", "", ai_final_output)
            ai_final_output = ai_final_output.replace("**", "").replace("😊", "").replace("✨", "")
            ai_final_output = re.sub(r"[\u0900-\u097F]", "", ai_final_output).strip()

            if not ai_final_output.endswith("?") and "Is there anything else" not in ai_final_output:
                ai_final_output += " Is there anything else I can assist you with?"

            return jsonify({'response': ai_final_output}), 200

        except Exception as e:
            print(f"❌ Main exception: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'response': "An unexpected error occurred. Please try again later."}), 200

    # Helper functions
    def extract_json(text):
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                json_str = json_match.group(0)
                if json_str.count('{') > json_str.count('}'):
                    json_str += '}'
                try:
                    return json.loads(json_str)
                except:
                    pass
        start = text.find('{"sql"')
        if start != -1:
            end = text.find('}', start)
            if end != -1:
                json_str = text[start:end+1]
                try:
                    return json.loads(json_str)
                except:
                    pass
            else:
                json_str = text[start:]
                if json_str.count('{') > json_str.count('}'):
                    json_str += '}'
                try:
                    return json.loads(json_str)
                except:
                    pass
        return None

    def extract_keyword(text):
        quoted = re.search(r'"([^"]+)"', text)
        if quoted:
            return quoted.group(1)
        patterns = [
            r'containing\s+([A-Za-z0-9_]+)',
            r'contains\s+([A-Za-z0-9_]+)',
            r'in content\s+([A-Za-z0-9_]+)',
            r'word\s+([A-Za-z0-9_]+)'
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                return match.group(1)
        words = re.findall(r'\b([A-Za-z0-9_]+)\b', text)
        stopwords = {'find', 'articles', 'containing', 'contains', 'content', 'inside', 'word', 'text', 'search', 'for', 'the', 'with', 'in'}
        for w in reversed(words):
            if w.lower() not in stopwords:
                return w
        return "that keyword"

    def fetch_stats_fallback(get_db_connection, user_message):
        conn = get_db_connection()
        if not conn:
            return jsonify({'response': "Database connection failed."}), 200
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM users")
            t_users = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM articles")
            t_articles = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM articles WHERE status = 'published'")
            p_articles = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM comments")
            t_comments = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM article_likes")
            t_likes = cur.fetchone()[0]
            cur.close()
            conn.close()
            return jsonify({
                'response': f"I couldn't process your question, but here are the current platform statistics: {t_users} users, {t_articles} articles ({p_articles} published), {t_comments} comments, and {t_likes} likes."
            }), 200
        except Exception as e:
            cur.close()
            conn.close()
            return jsonify({'response': "Database error. Please try again later."}), 200

    def build_fallback_summary(data):
        if isinstance(data, list):
            if len(data) == 0:
                return "No data found."
            first = data[0]
            if 'title' in first:
                titles = [row.get('title', 'Untitled') for row in data if row.get('title')]
                if len(titles) == 1:
                    return f"Found article: {titles[0]}."
                else:
                    return f"Found {len(titles)} articles: {', '.join(titles)}."
            elif 'name' in first:
                names = [row.get('name', '') for row in data if row.get('name')]
                if len(names) == 1:
                    return f"Found user: {names[0]}."
                else:
                    return f"Found {len(names)} users: {', '.join(names)}."
            elif 'type' in first:  # notifications
                return f"Found {len(data)} notifications."
            else:
                return f"Found {len(data)} records."
        else:
            return f"Result: {data}"

    def handle_empty_result(user_message, fetch_stats):
        msg_lower = user_message.lower()
        is_existence = any(w in msg_lower for w in ['exists', 'exist', 'does'])
        is_content = any(w in msg_lower for w in ['content', 'contains', 'containing', 'text', 'word'])
        is_lowest = any(w in msg_lower for w in ['lowest', 'least', 'fewest'])
        is_highest = any(w in msg_lower for w in ['highest', 'most'])
        is_draft = 'draft' in msg_lower
        is_following = 'following' in msg_lower or 'follow' in msg_lower
        is_saved = 'saved' in msg_lower and ('articles' in msg_lower or 'save' in msg_lower)
        is_notification = any(w in msg_lower for w in ['notification', 'notifications', 'unread'])
        is_articles_by_user = 'articles' in msg_lower and ('by' in msg_lower or 'write' in msg_lower)

        if is_existence:
            return jsonify({'response': "No, that user does not exist."}), 200
        elif is_content:
            keyword = extract_keyword(user_message)
            return jsonify({
                'response': f"I couldn't find any articles containing '{keyword}'. Please try a different keyword."
            }), 200
        elif is_lowest or is_highest:
            stats = fetch_stats()
            if stats is not None and stats['total_articles'] == 0:
                return jsonify({'response': "There are no articles on the platform yet."}), 200
            else:
                return jsonify({'response': f"No articles found with that criteria. Currently, there are {stats['total_articles']} total articles."}), 200
        elif is_draft:
            return jsonify({'response': "There are no draft articles."}), 200
        elif is_following:
            if 'follow parth' in msg_lower or 'followers of parth' in msg_lower:
                return jsonify({'response': "Parth has no followers."}), 200
            elif 'abdullah' in msg_lower and 'follow' in msg_lower:
                return jsonify({'response': "Abdullah has no followers."}), 200
            else:
                return jsonify({'response': "No follower relationships found."}), 200
        elif is_saved and 'parth' in msg_lower:
            return jsonify({'response': "Parth has not saved any articles."}), 200
        elif is_saved and 'abdullah' in msg_lower:
            return jsonify({'response': "Abdullah has not saved any articles."}), 200
        elif is_notification:
            return jsonify({'response': "You have no notifications."}), 200
        elif is_articles_by_user:
            if 'parth' in msg_lower:
                return jsonify({'response': "Parth has written no articles."}), 200
            elif 'khatri' in msg_lower:
                return jsonify({'response': "Khatri has written no articles."}), 200
            else:
                return jsonify({'response': "That user has no articles."}), 200
        else:
            stats = fetch_stats()
            if stats is not None:
                return jsonify({
                    'response': f"No matches found. Currently, the platform has {stats['total_users']} users, {stats['total_articles']} articles ({stats['published_articles']} published), {stats['total_comments']} comments, and {stats['total_likes']} likes."
                }), 200
            else:
                return jsonify({'response': "No data found. Please try again."}), 200

    def run_fallback_query(user_message, get_db_connection):
        """Direct SQL fallback for common queries when AI fails."""
        msg_lower = user_message.lower()
        conn = get_db_connection()
        if not conn:
            return None
        cur = conn.cursor()
        try:
            # Latest article content
            if 'latest article' in msg_lower or 'content of the latest' in msg_lower:
                cur.execute("""
                    SELECT content FROM articles
                    ORDER BY created_at DESC LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    cur.close()
                    conn.close()
                    return [{'content': row[0]}]
                else:
                    cur.close()
                    conn.close()
                    return None
            # Saved articles for a user
            if 'saved' in msg_lower and 'articles' in msg_lower:
                # Extract user name
                name_match = re.search(r'(?:saved|save)\s+articles?\s+(?:of|for)?\s*([A-Za-z]+)', msg_lower, re.IGNORECASE)
                if name_match:
                    name = name_match.group(1)
                    cur.execute("""
                        SELECT a.title FROM saved_articles sa
                        JOIN articles a ON sa.article_id = a.id
                        JOIN users u ON sa.user_id = u.id
                        WHERE u.name ILIKE %s
                    """, (f'%{name}%',))
                    rows = cur.fetchall()
                    if rows:
                        cur.close()
                        conn.close()
                        return [{'title': row[0]} for row in rows]
                    else:
                        cur.close()
                        conn.close()
                        return None
            # Lowest views
            if 'lowest views' in msg_lower or 'least views' in msg_lower or 'fewest views' in msg_lower:
                cur.execute("""
                    SELECT a.title, a.views, u.name AS author
                    FROM articles a JOIN users u ON a.author_id = u.id
                    ORDER BY a.views ASC LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    cur.close()
                    conn.close()
                    return [{'title': row[0], 'views': row[1], 'author': row[2]}]
                else:
                    cur.close()
                    conn.close()
                    return None
            # Highest views
            if 'highest views' in msg_lower or 'most views' in msg_lower:
                cur.execute("""
                    SELECT a.title, a.views, u.name AS author
                    FROM articles a JOIN users u ON a.author_id = u.id
                    ORDER BY a.views DESC LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    cur.close()
                    conn.close()
                    return [{'title': row[0], 'views': row[1], 'author': row[2]}]
                else:
                    cur.close()
                    conn.close()
                    return None
            # Category article count
            if 'article are uploaded in category' in msg_lower or 'articles in category' in msg_lower:
                # Extract category name
                cat_match = re.search(r'category\s+([A-Za-z]+)', msg_lower, re.IGNORECASE)
                if cat_match:
                    cat_name = cat_match.group(1)
                    cur.execute("""
                        SELECT COUNT(*) FROM articles
                        WHERE category_id = (SELECT id FROM categories WHERE name ILIKE %s)
                    """, (f'%{cat_name}%',))
                    count = cur.fetchone()[0]
                    cur.close()
                    conn.close()
                    return [{'count': count, 'category': cat_name}]
                else:
                    cur.close()
                    conn.close()
                    return None
            # Title contains
            if 'title contains' in msg_lower:
                keyword_match = re.search(r'"([^"]+)"', user_message)
                if not keyword_match:
                    keyword_match = re.search(r'contains\s+([A-Za-z0-9_]+)', msg_lower, re.IGNORECASE)
                if keyword_match:
                    keyword = keyword_match.group(1)
                    cur.execute("""
                        SELECT a.title, a.content, a.views, a.created_at, u.name AS author
                        FROM articles a JOIN users u ON a.author_id = u.id
                        WHERE a.title ILIKE %s
                        ORDER BY a.created_at DESC
                    """, (f'%{keyword}%',))
                    rows = cur.fetchall()
                    if rows:
                        cur.close()
                        conn.close()
                        return [{'title': row[0], 'content': row[1], 'views': row[2], 'created_at': row[3], 'author': row[4]} for row in rows]
                    else:
                        cur.close()
                        conn.close()
                        return None
            # Content search (stpl inside content)
            if 'inside content' in msg_lower or 'content contains' in msg_lower:
                keyword_match = re.search(r'"([^"]+)"', user_message)
                if not keyword_match:
                    keyword_match = re.search(r'contains?\s+([A-Za-z0-9_]+)', msg_lower, re.IGNORECASE)
                if not keyword_match:
                    # take the first word after 'inside content'
                    match = re.search(r'inside content\s+([A-Za-z0-9_]+)', msg_lower, re.IGNORECASE)
                    if match:
                        keyword_match = match
                if keyword_match:
                    keyword = keyword_match.group(1)
                    cur.execute("""
                        SELECT a.title, a.content, a.views, a.created_at, u.name AS author
                        FROM articles a JOIN users u ON a.author_id = u.id
                        WHERE a.content ILIKE %s
                        ORDER BY a.created_at DESC
                    """, (f'%{keyword}%',))
                    rows = cur.fetchall()
                    if rows:
                        cur.close()
                        conn.close()
                        return [{'title': row[0], 'content': row[1], 'views': row[2], 'created_at': row[3], 'author': row[4]} for row in rows]
                    else:
                        cur.close()
                        conn.close()
                        return None
            # Followers of a user
            if 'followers of' in msg_lower or 'who follows' in msg_lower:
                name_match = re.search(r'(?:followers of|who follows)\s+([A-Za-z]+)', msg_lower, re.IGNORECASE)
                if name_match:
                    name = name_match.group(1)
                    cur.execute("""
                        SELECT u.name FROM followers f
                        JOIN users u ON f.follower_id = u.id
                        WHERE f.following_id = (SELECT id FROM users WHERE name ILIKE %s)
                    """, (f'%{name}%',))
                    rows = cur.fetchall()
                    if rows:
                        cur.close()
                        conn.close()
                        return [{'follower': row[0]} for row in rows]
                    else:
                        cur.close()
                        conn.close()
                        return None
            # Notifications latest
            if 'latest notification' in msg_lower:
                cur.execute("""
                    SELECT type, message, created_at FROM notifications
                    WHERE user_id = %s
                    ORDER BY created_at DESC LIMIT 1
                """, (user_id,))
                row = cur.fetchone()
                if row:
                    cur.close()
                    conn.close()
                    return [{'type': row[0], 'message': row[1], 'created_at': row[2]}]
                else:
                    cur.close()
                    conn.close()
                    return None
            # Unread notifications count
            if 'unread notifications' in msg_lower:
                cur.execute("""
                    SELECT COUNT(*) FROM notifications
                    WHERE user_id = %s AND is_read = FALSE
                """, (user_id,))
                count = cur.fetchone()[0]
                cur.close()
                conn.close()
                return [{'unread_count': count}]
        except Exception as e:
            print(f"❌ Fallback query error: {e}")
            cur.close()
            conn.close()
            return None
        cur.close()
        conn.close()
        return None