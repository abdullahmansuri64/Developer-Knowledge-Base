# 📚 Developer Knowledge Base (DevKB)

A full‑stack web application where developers can share, discover, and manage technical articles – combining the best of **Medium**, **Notion**, and **Stack Overflow** – with an **AI‑powered chat assistant** that answers questions using your database in real time.

---

## ✨ Features

- ✅ **User Authentication** – Register, login, JWT‑protected routes, password reset with OTP (email).
- 📝 **Article Management** – Create, edit, delete, draft/publish, view counts, and search.
- 🏷️ **Categories** – Pre‑defined categories (Frontend, Backend, AI, etc.) with article counts.
- 💬 **Comments** – Nested replies, like/unlike, and reply notifications.
- ❤️ **Likes** – Like articles and comments.
- 👥 **Follow System** – Follow/unfollow users, see articles from followed users.
- 🔔 **Real‑time Notifications** – Unread counts and live updates for likes, comments, follows, and new articles.
- 💾 **Saved Articles** – Bookmark articles, list saved, check if saved.
- 📄 **PDF Export** – Download any published article as a PDF.
- 🤖 **AI Chat Assistant** – Natural‑language Q&A that dynamically generates SQL and returns conversational answers.
- 🌓 **Dark Mode** – Full dark/light theme toggle.
- 📱 **Responsive** – Works on desktop, tablet, and mobile.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js, React Router, Bootstrap 5, Axios, Vite, Bootstrap Icons |
| **Backend** | Python 3, Flask, Flask‑CORS, PyJWT, bcrypt, psycopg2, python‑dotenv |
| **Database** | PostgreSQL (port 5433) |
| **AI** | Ollama (local) with `gemma2:2b` model (port 11435) |
| **Email (Dev)** | MailHog (SMTP on port 1025, UI on port 8025) |
| **PDF** | ReportLab |

---

## 🚀 Installation & Setup

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 14+
- [Ollama](https://ollama.com) (for AI)
- [MailHog](https://github.com/mailhog/MailHog) (for email testing)

---
eveloper-Knowledge-Base/
├── backend/
│ ├── app.py # Main Flask application
│ ├── ai_chat.py # AI chat route registration & prompts
│ ├── requirements.txt # Python dependencies
│ └── .env # Environment variables (create this)
├── frontend/
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ │ ├── Navbar.jsx
│ │ │ ├── Sidebar.jsx
│ │ │ ├── ArticleCard.jsx
│ │ │ ├── CommentSection.jsx
│ │ │ ├── NotificationBell.jsx
│ │ │ ├── FollowButton.jsx
│ │ │ ├── SaveButton.jsx
│ │ │ ├── StatsCard.jsx
│ │ │ └── PrivateRoute.jsx
│ │ ├── pages/ # Page components
│ │ │ ├── Login.jsx
│ │ │ ├── Register.jsx
│ │ │ ├── ForgotPassword.jsx
│ │ │ ├── Dashboard.jsx
│ │ │ ├── AllArticles.jsx
│ │ │ ├── ViewArticle.jsx
│ │ │ ├── CreateArticle.jsx
│ │ │ ├── EditArticle.jsx
│ │ │ ├── MyArticles.jsx
│ │ │ ├── SavedArticles.jsx
│ │ │ ├── Following.jsx
│ │ │ ├── Profile.jsx
│ │ │ ├── NotificationsPage.jsx
│ │ │ └── AIChat.jsx
│ │ ├── services/
│ │ │ └── api.js # Axios configuration
│ │ ├── App.jsx
│ │ ├── index.jsx
│ │ └── index.css
│ ├── package.json
│ └── vite.config.js
├── .gitignore # Git ignore file
├── README.md # This file
└── LICENSE # MIT License (optional)
### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Developer-Knowledge-Base.git
cd Developer-Knowledge-Base
2. Backend Setup
bash
cd backend
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt
Create a .env file in backend/ (see Environment Variables below).

3. Frontend Setup
bash
cd ../frontend
npm install
4. Database Setup
Ensure PostgreSQL is running.

Create a database named knowledge_base (or your chosen name).

The first time you run app.py, the tables and default categories will be created automatically.

5. Start Services
Start Ollama (AI)
bash
# Set host and port (Windows)
set OLLAMA_HOST=127.0.0.1:11435
ollama serve

# On Linux/macOS
export OLLAMA_HOST=127.0.0.1:11435
ollama serve
Pull the required model (if not already present):

bash
ollama pull gemma2:2b
Start MailHog (Email Testing)
bash
mailhog   # SMTP: localhost:1025, UI: http://localhost:8025
Start Backend
bash
cd backend
python app.py   # Runs on port 5000
Start Frontend
bash
cd frontend
npm run dev     # Runs on port 5173
🔐 Environment Variables
Create a .env file inside the backend/ folder with the following:

env
DB_HOST=localhost
DB_NAME=knowledge_base
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5433
JWT_SECRET_KEY=your_secret_key
MAIL_USERNAME=your_email@gmail.com       # For production (Gmail SMTP)
MAIL_PASSWORD=your_app_password          # For production
Note: For development, you can use MailHog by modifying the send_email() function in app.py – no credentials required.

🧪 Running the AI Chat Assistant
The AI Chat endpoint (/api/chat) works in two stages:

SQL Routing – Ollama converts your natural‑language question into a PostgreSQL query.

Data Summarisation – The result is turned into a friendly, human‑readable answer.

All queries are read‑only – the AI cannot delete or modify data.

Example Questions:

“Show me all users”

“Which article has the lowest views?”

“What articles did Parth save?”

“How many unread notifications do I have?”

📦 API Endpoints (Summary)
Method	Endpoint	Description
Auth		
POST	/api/auth/register	Register new user
POST	/api/auth/login	Login
POST	/api/auth/forgot-password	Send OTP
POST	/api/auth/verify-otp	Verify OTP, get reset token
POST	/api/auth/reset-password	Reset password
GET	/api/auth/generate-password	Generate strong password
Articles		
GET	/api/articles	Get published articles
POST	/api/articles	Create article
GET	/api/articles/:id	Get single article
PUT	/api/articles/:id	Update article
DELETE	/api/articles/:id	Delete article
GET	/api/articles/my	Get current user’s articles
GET	/api/articles/search?q=	Search articles
POST	/api/articles/:id/like	Toggle like
Comments		
GET	/api/articles/:id/comments	Get comments
POST	/api/comments	Add comment
DELETE	/api/comments/:id	Delete comment
POST	/api/comments/:id/like	Toggle like on comment
Follow		
POST	/api/follow/:id	Follow/unfollow user
GET	/api/follow/check/:id	Check if following
GET	/api/following-articles	Articles from followed users
Save		
POST	/api/saved-articles	Save/unsave article
GET	/api/saved-articles	Get saved articles
GET	/api/saved-articles/:id	Check if saved
Notifications		
GET	/api/notifications/unread-count	Unread count
GET	/api/notifications	Get notifications (50 latest)
PUT	/api/notifications/:id/read	Mark one read
PUT	/api/notifications/read-all	Mark all read
Profile		
GET	/api/users/profile	Get current user
PUT	/api/users/profile	Update name
AI Chat		
POST	/api/chat	Send a message; returns AI answer
PDF		
GET	/api/articles/:id/download/pdf	Download article as PDF
🤖 AI Chat Engine – How It Works
User asks a question – e.g., “How many articles did Parth write?”

Backend routes the question to Ollama with a prompt containing the database schema and many examples.

Ollama returns a SELECT query – e.g., SELECT COUNT(*) FROM articles WHERE author_id = (SELECT id FROM users WHERE name ILIKE '%Parth%').

Backend executes the query on PostgreSQL.

Result is passed back to Ollama with a summarisation prompt.

Ollama returns a natural‑language answer – e.g., “Parth wrote 4 articles.”

The answer is sent to the frontend and displayed in the chat UI.

The assistant is read‑only – it cannot insert, update, or delete any data.

🧑‍💻 Development & Contribution
Fork the repository.

Create a new branch for your feature (git checkout -b feature/amazing-feature).

Commit your changes (git commit -m 'Add some amazing feature').

Push to the branch (git push origin feature/amazing-feature).

Open a Pull Request.

📜 License
This project is licensed under the MIT License – see the LICENSE file for details.

🙏 Acknowledgements
Ollama – for local AI inference.

MailHog – for local email testing.

Bootstrap – for responsive design.

Font Awesome – for icons (or Bootstrap Icons, depending on your project).

📞 Contact
For any questions or support, please open an issue on GitHub or reach out to the maintainer.

