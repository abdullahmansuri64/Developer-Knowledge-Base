import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PrivateRoute from './components/PrivateRoute';  // ✅ Now exists!

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AllArticles from './pages/AllArticles';
import ViewArticle from './pages/ViewArticle';
import CreateArticle from './pages/CreateArticle';
import EditArticle from './pages/EditArticle';
import MyArticles from './pages/MyArticles';
import SavedArticles from './pages/SavedArticles';
import Following from './pages/Following';
import Profile from './pages/Profile';
import NotificationsPage from './pages/NotificationsPage';
import AIChat from './pages/AIChat';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<PrivateRoute />}>
          <Route path="/dashboard" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/articles" element={
            <Layout>
              <AllArticles />
            </Layout>
          } />
          <Route path="/articles/:id" element={
            <Layout>
              <ViewArticle />
            </Layout>
          } />
          <Route path="/create-article" element={
            <Layout>
              <CreateArticle />
            </Layout>
          } />
          <Route path="/edit-article/:id" element={
            <Layout>
              <EditArticle />
            </Layout>
          } />
          <Route path="/my-articles" element={
            <Layout>
              <MyArticles />
            </Layout>
          } />
          <Route path="/saved-articles" element={
            <Layout>
              <SavedArticles />
            </Layout>
          } />
          <Route path="/following" element={
            <Layout>
              <Following />
            </Layout>
          } />
          <Route path="/profile" element={
            <Layout>
              <Profile />
            </Layout>
          } />
          <Route path="/notifications" element={
            <Layout>
              <NotificationsPage />
            </Layout>
          } />
          <Route path="/ai-chat" element={
            <Layout>
              <AIChat />
            </Layout>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
};

// Layout component with Navbar and Sidebar
const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <Navbar />
      <div className="app-main">
        <Sidebar />
        <div className="content-area">
          <Container fluid className="p-0">
            {children}
          </Container>
        </div>
      </div>
    </div>
  );
};

export default App;