import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const isCategoryActive = (category) => {
    const params = new URLSearchParams(location.search);
    return params.get('category') === category ? 'active' : '';
  };

  return (
    <div className="sidebar">
      <div className="mb-4">
        <h6 className="text-muted text-uppercase small fw-bold mb-3">Menu</h6>
        <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard')}`}>
          <i className="bi bi-grid-1x2-fill"></i> Dashboard
        </Link>
        <Link to="/articles" className={`sidebar-link ${isActive('/articles')}`}>
          <i className="bi bi-collection"></i> All Articles
        </Link>
        <Link to="/following" className={`sidebar-link ${isActive('/following')}`}>
          <i className="bi bi-people"></i> Following
        </Link>
        <Link to="/my-articles" className={`sidebar-link ${isActive('/my-articles')}`}>
          <i className="bi bi-file-earmark-text"></i> My Articles
        </Link>
        <Link to="/saved-articles" className={`sidebar-link ${isActive('/saved-articles')}`}>
          <i className="bi bi-bookmark"></i> Saved
        </Link>
        <Link to="/notifications" className={`sidebar-link ${isActive('/notifications')}`}>
          <i className="bi bi-bell"></i> Notifications
        </Link>
        <Link to="/create-article" className={`sidebar-link ${isActive('/create-article')}`}>
          <i className="bi bi-plus-circle"></i> Create Article
        </Link>
      </div>
      
      <div>
        <h6 className="text-muted text-uppercase small fw-bold mb-3">Categories</h6>
        <Link to="/articles" className={`sidebar-link ${isActive('/articles') && !isCategoryActive('frontend') && !isCategoryActive('backend') && !isCategoryActive('database') && !isCategoryActive('devops') && !isCategoryActive('ai') && !isCategoryActive('python') && !isCategoryActive('react') && !isCategoryActive('postgresql') ? 'active' : ''}`}>
          <i className="bi bi-grid"></i> All
        </Link>
        <Link to="/articles?category=frontend" className={`sidebar-link ${isCategoryActive('frontend')}`}>
          <i className="bi bi-code-square"></i> Frontend
        </Link>
        <Link to="/articles?category=backend" className={`sidebar-link ${isCategoryActive('backend')}`}>
          <i className="bi bi-server"></i> Backend
        </Link>
        <Link to="/articles?category=database" className={`sidebar-link ${isCategoryActive('database')}`}>
          <i className="bi bi-database"></i> Database
        </Link>
        <Link to="/articles?category=devops" className={`sidebar-link ${isCategoryActive('devops')}`}>
          <i className="bi bi-cloud"></i> DevOps
        </Link>
        <Link to="/articles?category=ai" className={`sidebar-link ${isCategoryActive('ai')}`}>
          <i className="bi bi-robot"></i> AI
        </Link>
        <Link to="/articles?category=python" className={`sidebar-link ${isCategoryActive('python')}`}>
          <i className="bi bi-file-code"></i> Python
        </Link>
        <Link to="/articles?category=react" className={`sidebar-link ${isCategoryActive('react')}`}>
          <i className="bi bi-bootstrap"></i> React
        </Link>
        <Link to="/articles?category=postgresql" className={`sidebar-link ${isCategoryActive('postgresql')}`}>
          <i className="bi bi-database"></i> PostgreSQL
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;