import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    articles: 0,
    followers: 0,
    following: 0
  });

  useEffect(() => {
    fetchProfile();
    fetchUserStats();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📡 Fetching profile...');
      const response = await api.get('/users/profile');
      console.log('✅ Profile response:', response.data);
      
      setUser(response.data.user);
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      console.error('❌ Error details:', err.response?.data);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Get user's articles count
      const articlesRes = await api.get('/articles/my');
      const articles = articlesRes.data.articles || [];
      
      // For followers/following, we would need separate endpoints
      // For now, we'll set placeholder values
      setStats({
        articles: articles.length,
        followers: 0,
        following: 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getMemberSince = (date) => {
    if (!date) return 'Recently';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger" className="rounded-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchProfile}>
            <i className="bi bi-arrow-repeat me-1"></i> Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-4">
        <Alert variant="warning" className="rounded-3">
          <i className="bi bi-info-circle me-2"></i>
          User not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: '900px' }}>
      {/* Profile Header Card */}
      <Card className="profile-card shadow-sm border-0">
        <div className="profile-cover"></div>
        <Card.Body className="p-4 p-md-5">
          <div className="profile-header">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {getInitials(user.name)}
              </div>
              <div className="profile-status-dot"></div>
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{user.name || 'User'}</h2>
              <p className="profile-email">
                <i className="bi bi-envelope me-2"></i>
                {user.email || ''}
              </p>
              <div className="profile-meta">
                <span>
                  <i className="bi bi-calendar3 me-1"></i>
                  Member since {getMemberSince(user.created_at)}
                </span>
                <span className="mx-2">•</span>
                <span>
                  <Badge bg="primary">{user.role || 'user'}</Badge>
                </span>
              </div>
            </div>
          </div>

          <hr className="profile-divider" />

          {/* Stats Row */}
          <Row className="g-3 mb-4">
            <Col md={4}>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="bi bi-file-earmark-text"></i>
                </div>
                <div>
                  <div className="profile-stat-value">{stats.articles}</div>
                  <div className="profile-stat-label">Articles</div>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="bi bi-people"></i>
                </div>
                <div>
                  <div className="profile-stat-value">{stats.followers}</div>
                  <div className="profile-stat-label">Followers</div>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="bi bi-person-plus"></i>
                </div>
                <div>
                  <div className="profile-stat-value">{stats.following}</div>
                  <div className="profile-stat-label">Following</div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Action Buttons */}
          <div className="profile-actions">
            <Button 
              as={Link} 
              to="/edit-profile"
              variant="primary"
              className="rounded-pill px-4"
            >
              <i className="bi bi-pencil me-2"></i> Edit Profile
            </Button>
            <Button 
              as={Link} 
              to="/my-articles"
              variant="outline-primary"
              className="rounded-pill px-4"
            >
              <i className="bi bi-file-earmark-text me-2"></i> My Articles
            </Button>
            <Button 
              as={Link} 
              to="/saved-articles"
              variant="outline-secondary"
              className="rounded-pill px-4"
            >
              <i className="bi bi-bookmark me-2"></i> Saved
            </Button>
            <Button 
              variant="outline-danger"
              onClick={handleLogout}
              className="rounded-pill px-4"
            >
              <i className="bi bi-box-arrow-right me-2"></i> Logout
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Profile;