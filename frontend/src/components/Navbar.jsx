import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Dropdown } from 'react-bootstrap';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setUser(null);
      }
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = () => {
    if (!user || !user.name) return 'U';
    const name = user.name.trim();
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = () => {
    if (!user || !user.name) return '#4F46E5';
    
    const colors = [
      '#4F46E5', '#7C3AED', '#EC4899', '#EF4444',
      '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
      '#8B5CF6', '#D946EF', '#F43F5E', '#14B8A6'
    ];
    
    let hash = 0;
    for (let i = 0; i < user.name.length; i++) {
      hash = user.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <BsNavbar 
      expand="lg" 
      className="shadow-sm py-2 sticky-top navbar-custom"
      style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 1050,
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--navbar-border)',
        transition: 'all 0.3s ease'
      }}
    >
      <Container fluid>
        <BsNavbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
          <div className="brand-icon me-2">
            <i className="bi bi-code-square"></i>
          </div>
          <span className="fw-bold fs-5">
            <span className="text-primary">Dev</span><span className="text-dark">KB</span>
          </span>
        </BsNavbar.Brand>
        
        <BsNavbar.Toggle aria-controls="navbar-nav" />
        <BsNavbar.Collapse id="navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link 
              as={Link} 
              to="/dashboard" 
              className={`mx-1 nav-link-custom ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              <i className="bi bi-grid-1x2-fill"></i> Dashboard
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/articles" 
              className={`mx-1 nav-link-custom ${location.pathname === '/articles' ? 'active' : ''}`}
            >
              <i className="bi bi-collection"></i> Articles
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/following" 
              className={`mx-1 nav-link-custom ${location.pathname === '/following' ? 'active' : ''}`}
            >
              <i className="bi bi-people"></i> Following
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/my-articles" 
              className={`mx-1 nav-link-custom ${location.pathname === '/my-articles' ? 'active' : ''}`}
            >
              <i className="bi bi-file-earmark-text"></i> My Articles
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/saved-articles" 
              className={`mx-1 nav-link-custom ${location.pathname === '/saved-articles' ? 'active' : ''}`}
            >
              <i className="bi bi-bookmark"></i> Saved
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/create-article" 
              className="mx-1 text-primary fw-bold nav-link-custom"
            >
              <i className="bi bi-plus-circle"></i> Create
            </Nav.Link>
            
            {/* ⭐ NEW: AI Chat Link */}
            <Nav.Link 
              as={Link} 
              to="/ai-chat" 
              className={`mx-1 nav-link-custom ${location.pathname === '/ai-chat' ? 'active' : ''}`}
            >
              <i className="bi bi-robot"></i> AI Chat
            </Nav.Link>
            
            <NotificationBell />
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="dark-mode-toggle"
              aria-label="Toggle dark mode"
            >
              <i className={`bi bi-${isDarkMode ? 'sun' : 'moon'}-fill`}></i>
              <span>
                {isDarkMode ? 'Light' : 'Dark'}
              </span>
            </button>
            
            <Dropdown align="end" className="profile-dropdown ms-2">
              <Dropdown.Toggle variant="link" className="text-decoration-none p-0">
                <div 
                  className="avatar-circle"
                  style={{ 
                    background: `linear-gradient(135deg, ${getAvatarColor()}, ${getAvatarColor()}dd)`,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  {getInitials()}
                </div>
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                <Dropdown.Header className="py-2">
                  <div className="d-flex align-items-center">
                    <div 
                      className="avatar-circle me-2" 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        fontSize: '14px',
                        background: `linear-gradient(135deg, ${getAvatarColor()}, ${getAvatarColor()}dd)`
                      }}
                    >
                      {getInitials()}
                    </div>
                    <div>
                      <div className="fw-bold">{user?.name || 'User'}</div>
                      <div className="text-muted small">{user?.email || ''}</div>
                    </div>
                  </div>
                </Dropdown.Header>
                <Dropdown.Divider />
                <Dropdown.Item as={Link} to="/profile">
                  <i className="bi bi-person me-2"></i> Profile
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/saved-articles">
                  <i className="bi bi-bookmark me-2"></i> Saved Articles
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/following">
                  <i className="bi bi-people me-2"></i> Following
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/notifications">
                  <i className="bi bi-bell me-2"></i> Notifications
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/ai-chat">
                  <i className="bi bi-robot me-2"></i> AI Chat
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <i className="bi bi-box-arrow-right me-2"></i> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;