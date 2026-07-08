require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'knowledge_base',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Initialize database tables
const initDB = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    // Create articles table
    await pool.query(`
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
    `);

    // Insert default categories
    const categories = [
      ['Frontend', 'Frontend development technologies and best practices'],
      ['Backend', 'Backend development, APIs, and server-side technologies'],
      ['Database', 'Database design, optimization, and management'],
      ['DevOps', 'DevOps practices, CI/CD, and infrastructure'],
      ['AI', 'Artificial Intelligence, Machine Learning, and Data Science'],
      ['Python', 'Python programming language and frameworks'],
      ['React', 'React library and ecosystem'],
      ['PostgreSQL', 'PostgreSQL database management and optimization']
    ];

    for (const [name, description] of categories) {
      await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [name, description]
      );
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

initDB();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', message: 'API is running' });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
      [name, email, password_hash]
    );

    const user = result.rows[0];
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET_KEY || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token is missing!' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'your-secret-key');
    req.userId = decoded.user_id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired!' });
    }
    return res.status(401).json({ error: 'Invalid token!' });
  }
};

// Article Routes
app.post('/api/articles', verifyToken, async (req, res) => {
  try {
    const { title, content, category_id, status = 'draft' } = req.body;
    const result = await pool.query(
      'INSERT INTO articles (title, content, author_id, category_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, content, req.userId, category_id, status]
    );
    res.status(201).json({
      message: 'Article created successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

app.get('/api/articles', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             u.name as author_name,
             c.name as category_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'published'
      ORDER BY a.created_at DESC
    `);
    res.json({ articles: result.rows });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

app.get('/api/articles/my', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, c.name as category_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.author_id = $1
      ORDER BY a.created_at DESC
    `, [req.userId]);
    res.json({ articles: result.rows });
  } catch (error) {
    console.error('Get my articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

app.get('/api/articles/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             u.name as author_name,
             c.name as category_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = result.rows[0];
    
    // Check if user can view draft
    if (article.status === 'draft' && article.author_id !== req.userId) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment views
    await pool.query('UPDATE articles SET views = views + 1 WHERE id = $1', [req.params.id]);

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

app.put('/api/articles/:id', verifyToken, async (req, res) => {
  try {
    const { title, content, category_id, status } = req.body;
    
    // Check ownership
    const checkResult = await pool.query(
      'SELECT author_id FROM articles WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (checkResult.rows[0].author_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this article' });
    }

    const result = await pool.query(
      'UPDATE articles SET title = $1, content = $2, category_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [title, content, category_id, status, req.params.id]
    );

    res.json({
      message: 'Article updated successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

app.delete('/api/articles/:id', verifyToken, async (req, res) => {
  try {
    // Check ownership
    const checkResult = await pool.query(
      'SELECT author_id FROM articles WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (checkResult.rows[0].author_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this article' });
    }

    await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/articles/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const result = await pool.query(`
      SELECT a.*, 
             u.name as author_name,
             c.name as category_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'published'
      AND (a.title ILIKE $1 OR a.content ILIKE $1 OR c.name ILIKE $1)
      ORDER BY a.created_at DESC
    `, [`%${q}%`]);

    res.json({ articles: result.rows });
  } catch (error) {
    console.error('Search articles error:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});