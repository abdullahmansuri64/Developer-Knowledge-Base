# 📚 Developer Knowledge Base (DevKB)

A full-stack web application where developers can share, discover, and manage technical articles—combining the best of Medium, Notion, and Stack Overflow—with an AI-powered chat assistant that answers questions using your PostgreSQL database in real time.

---

# ✨ Features

* ✅ User Authentication – Register, Login, JWT-protected routes, Password Reset with OTP (Email)
* 📝 Article Management – Create, Edit, Delete, Draft/Publish, View Counts, Search
* 🏷️ Categories – Predefined categories (Frontend, Backend, AI, etc.) with article counts
* 💬 Comments – Nested replies, Like/Unlike, Reply notifications
* ❤️ Likes – Like articles and comments
* 👥 Follow System – Follow/Unfollow users and view articles from followed users
* 🔔 Real-time Notifications – Live updates for likes, comments, follows, and new articles
* 💾 Saved Articles – Bookmark and manage saved articles
* 📄 PDF Export – Download published articles as PDF
* 🤖 AI Chat Assistant – Natural-language queries converted into SQL and summarized into conversational answers
* 🌓 Dark Mode – Light/Dark theme support
* 📱 Responsive Design – Desktop, Tablet, and Mobile compatible

---

# 🛠️ Technology Stack

| Layer    | Technology                                                          |
| -------- | ------------------------------------------------------------------- |
| Frontend | React.js, React Router, Bootstrap 5, Axios, Vite, Bootstrap Icons   |
| Backend  | Python 3, Flask, Flask-CORS, PyJWT, bcrypt, psycopg2, python-dotenv |
| Database | PostgreSQL (Port 5433)                                              |
| AI       | Ollama (Local) using `gemma2:2b`                                    |
| Email    | MailHog (SMTP: 1025, UI: 8025)                                      |
| PDF      | ReportLab                                                           |

---

# 📁 Project Structure

```text
Developer-Knowledge-Base/
│
├── backend/
│   ├── app.py                     # Main Flask application
│   ├── ai_chat.py                 # AI Chat routes
│   ├── requirements.txt           # Python dependencies
│   └── .env                       # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ArticleCard.jsx
│   │   │   ├── CommentSection.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── FollowButton.jsx
│   │   │   ├── SaveButton.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   └── PrivateRoute.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AllArticles.jsx
│   │   │   ├── ViewArticle.jsx
│   │   │   ├── CreateArticle.jsx
│   │   │   ├── EditArticle.jsx
│   │   │   ├── MyArticles.jsx
│   │   │   ├── SavedArticles.jsx
│   │   │   ├── Following.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── NotificationsPage.jsx
│   │   │   └── AIChat.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
└── LICENSE
```

---

# 🚀 Installation & Setup

## Prerequisites

* Python 3.9+
* Node.js 16+
* PostgreSQL 14+
* Ollama
* MailHog

---

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/Developer-Knowledge-Base.git
cd Developer-Knowledge-Base
```

---

## 2. Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside the **backend** folder.

---

## 3. Frontend Setup

```bash
cd ../frontend

npm install
```

---

## 4. Database Setup

* Ensure PostgreSQL is running.
* Create a database named **knowledge_base**.
* When the backend starts for the first time, all required tables and default categories will be created automatically.

---

## 5. Start Ollama

### Windows

```bash
set OLLAMA_HOST=127.0.0.1:11435
ollama serve
```

### Linux / macOS

```bash
export OLLAMA_HOST=127.0.0.1:11435
ollama serve
```

Download the AI model:

```bash
ollama pull gemma2:2b
```

---

## 6. Start MailHog

```bash
mailhog
```

SMTP Server:

```
localhost:1025
```

MailHog UI:

```
http://localhost:8025
```

---

## 7. Start Backend

```bash
cd backend

python app.py
```

Runs on:

```
http://localhost:5000
```

---

## 8. Start Frontend

```bash
cd frontend

npm run dev
```

Runs on:

```
http://localhost:5173
```

---

# 🔐 Environment Variables

Create a `.env` file inside the **backend** folder.

```env
DB_HOST=localhost
DB_NAME=knowledge_base
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5433

JWT_SECRET_KEY=your_secret_key

MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
```

> **Note:** During development you can use **MailHog**, so Gmail credentials are not required.

---

# 🧪 AI Chat Assistant

The AI Chat endpoint (`/api/chat`) works in two stages:

### 1. SQL Routing

The AI converts your natural-language question into a PostgreSQL `SELECT` query.

### 2. Data Summarisation

The query result is transformed into a friendly, conversational response.

The assistant is **read-only** and cannot insert, update, or delete data.

### Example Questions

* Show me all users
* Which article has the lowest views?
* What articles did Parth save?
* How many unread notifications do I have?

---

# 📦 API Endpoints

## Authentication

| Method | Endpoint                    |
| ------ | --------------------------- |
| POST   | /api/auth/register          |
| POST   | /api/auth/login             |
| POST   | /api/auth/forgot-password   |
| POST   | /api/auth/verify-otp        |
| POST   | /api/auth/reset-password    |
| GET    | /api/auth/generate-password |

## Articles

| Method | Endpoint                |
| ------ | ----------------------- |
| GET    | /api/articles           |
| POST   | /api/articles           |
| GET    | /api/articles/:id       |
| PUT    | /api/articles/:id       |
| DELETE | /api/articles/:id       |
| GET    | /api/articles/my        |
| GET    | /api/articles/search?q= |
| POST   | /api/articles/:id/like  |

## Comments

| Method | Endpoint                   |
| ------ | -------------------------- |
| GET    | /api/articles/:id/comments |
| POST   | /api/comments              |
| DELETE | /api/comments/:id          |
| POST   | /api/comments/:id/like     |

## Follow

| Method | Endpoint                |
| ------ | ----------------------- |
| POST   | /api/follow/:id         |
| GET    | /api/follow/check/:id   |
| GET    | /api/following-articles |

## Saved Articles

| Method | Endpoint                |
| ------ | ----------------------- |
| POST   | /api/saved-articles     |
| GET    | /api/saved-articles     |
| GET    | /api/saved-articles/:id |

## Notifications

| Method | Endpoint                        |
| ------ | ------------------------------- |
| GET    | /api/notifications              |
| GET    | /api/notifications/unread-count |
| PUT    | /api/notifications/:id/read     |
| PUT    | /api/notifications/read-all     |

## Profile

| Method | Endpoint           |
| ------ | ------------------ |
| GET    | /api/users/profile |
| PUT    | /api/users/profile |

## AI Chat

| Method | Endpoint  |
| ------ | --------- |
| POST   | /api/chat |

## PDF

| Method | Endpoint                       |
| ------ | ------------------------------ |
| GET    | /api/articles/:id/download/pdf |

---

# 🤖 AI Chat Engine Workflow

1. User asks a question.
2. Ollama converts the question into a PostgreSQL `SELECT` query.
3. Flask validates and executes the query.
4. PostgreSQL returns the requested data.
5. Ollama summarizes the results into a human-readable answer.
6. The response is displayed in the chat interface.

The AI assistant is **read-only** and cannot modify the database.

---

# 🧑‍💻 Contributing

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes.

```bash
git commit -m "Add amazing feature"
```

4. Push to GitHub.

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request.

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 🙏 Acknowledgements

* Ollama
* Flask
* React
* PostgreSQL
* Bootstrap
* Bootstrap Icons
* MailHog
* ReportLab

---

# 📞 Contact

For questions, suggestions, or bug reports, please create an issue on GitHub or contact the project maintainer.
