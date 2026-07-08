import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    myArticles: 0,
    drafts: 0,
    published: 0
  });
  const [latestArticles, setLatestArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setUser(null);
      }
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      try {
        const articlesRes = await api.get('/articles');
        const allArticles = articlesRes.data.articles || [];
        setLatestArticles(allArticles.slice(0, 5));
        setStats(prev => ({ ...prev, total: allArticles.length }));
      } catch (err) {
        console.error('Error fetching articles:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
      }

      try {
        const myArticlesRes = await api.get('/articles/my');
        const myArticles = myArticlesRes.data.articles || [];
        setStats(prev => ({
          ...prev,
          myArticles: myArticles.length,
          drafts: myArticles.filter(a => a.status === 'draft').length,
          published: myArticles.filter(a => a.status === 'published').length
        }));
      } catch (err) {
        console.error('Error fetching my articles:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
      }

    } catch (error) {
      console.error('Dashboard error:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return '#4F46E5';
    
    const colors = [
      '#4F46E5', '#7C3AED', '#EC4899', '#EF4444',
      '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
      '#8B5CF6', '#D946EF', '#F43F5E', '#14B8A6'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ============================================================
  // ⭐ ULTIMATE FIX: getTimeAgo with absolute fallback
  // ============================================================
  const getTimeAgo = (dateString) => {
    if (!dateString) {
      return 'Just now';
    }
    
    try {
      let pastDate = new Date(dateString);
      
      if (isNaN(pastDate.getTime())) {
        const fixedDate = dateString.replace(' ', 'T').replace('Z', '');
        pastDate = new Date(fixedDate);
        
        if (isNaN(pastDate.getTime())) {
          return 'Just now';
        }
      }
      
      const now = new Date();
      const diffMs = now.getTime() - pastDate.getTime();
      let diffSec = Math.floor(diffMs / 1000);
      
      // If diff is negative, use absolute value
      if (diffSec < 0) {
        diffSec = Math.abs(diffSec);
      }
      
      if (diffSec < 60) {
        return 'Just now';
      }
      
      const minutes = Math.floor(diffSec / 60);
      if (minutes < 60) {
        return `${minutes}m ago`;
      }
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) {
        return `${hours}h ago`;
      }
      
      const days = Math.floor(hours / 24);
      if (days < 7) {
        return `${days}d ago`;
      }
      
      const weeks = Math.floor(days / 7);
      if (weeks < 4) {
        return `${weeks}w ago`;
      }
      
      const pastDateObj = new Date(Date.now() - diffSec * 1000);
      return pastDateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('❌ Error in getTimeAgo:', error);
      return 'Just now';
    }
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
        <Alert variant="danger">
          <h5>Error</h5>
          <p>{error}</p>
          <Button variant="primary" onClick={fetchDashboardData}>
            <i className="bi bi-arrow-repeat me-2"></i> Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            👋 Welcome back, {user?.name || 'User'}!
          </h3>
          <p className="text-muted mb-0">Overview of your knowledge base activity</p>
        </div>
        <Button as={Link} to="/create-article" variant="primary" className="rounded-pill px-4">
          <i className="bi bi-plus-circle me-2"></i> Create Article
        </Button>
      </div>

      <Row className="g-4 mb-4">
        <Col md={3}>
          <StatsCard title="Total Articles" value={stats.total} icon="file-earmark-text" color="primary" />
        </Col>
        <Col md={3}>
          <StatsCard title="My Articles" value={stats.myArticles} icon="person" color="success" />
        </Col>
        <Col md={3}>
          <StatsCard title="Draft Articles" value={stats.drafts} icon="file-earmark" color="warning" />
        </Col>
        <Col md={3}>
          <StatsCard title="Published Articles" value={stats.published} icon="file-check" color="info" />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-clock-history text-primary me-2"></i>
                Latest Articles
              </h5>
              <Link to="/articles" className="text-decoration-none fw-semibold">
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {latestArticles.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-file-earmark-text display-4 text-muted d-block mb-3"></i>
                  <p className="text-muted">No articles published yet</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Views</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestArticles.map(article => (
                        <tr key={article.id}>
                          <td>
                            <Link to={`/articles/${article.id}`} className="text-decoration-none fw-semibold">
                              {article.title}
                            </Link>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div 
                                className="avatar-circle me-2" 
                                style={{ 
                                  width: '28px', 
                                  height: '28px', 
                                  fontSize: '10px',
                                  background: `linear-gradient(135deg, ${getAvatarColor(article.author?.name)}, ${getAvatarColor(article.author?.name)}dd)`
                                }}
                              >
                                {getInitials(article.author?.name)}
                              </div>
                              <span>{article.author?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td>
                            <Badge bg="light" text="dark" className="px-3 py-1">
                              {article.category?.name || 'Uncategorized'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={article.status === 'published' ? 'success' : 'warning'} className="px-3 py-1">
                              {article.status}
                            </Badge>
                          </td>
                          <td>
                            <i className="bi bi-eye me-1 text-muted"></i>
                            {article.views || 0}
                          </td>
                          <td className="text-muted small">
                            {getTimeAgo(article.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="bg-white border-top-0 text-center py-2">
              <Link to="/articles" className="text-decoration-none small">
                View all articles <i className="bi bi-arrow-right"></i>
              </Link>
            </Card.Footer>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-activity text-primary me-2"></i>
                Recent Activity
              </h5>
              <span className="badge bg-primary">{latestArticles.length}</span>
            </Card.Header>
            <Card.Body className="p-3">
              {latestArticles.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-clock display-6 d-block mb-2"></i>
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="activity-timeline">
                  {latestArticles.slice(0, 5).map((article, index) => (
                    <div key={article.id} className="activity-item">
                      <div className="activity-dot">
                        <div className="dot-icon">
                          {index === 0 ? (
                            <i className="bi bi-star-fill"></i>
                          ) : (
                            <i className="bi bi-file-earmark-plus"></i>
                          )}
                        </div>
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="activity-avatar"
                              style={{
                                background: `linear-gradient(135deg, ${getAvatarColor(article.author?.name)}, ${getAvatarColor(article.author?.name)}dd)`
                              }}
                            >
                              {getInitials(article.author?.name)}
                            </div>
                            <div className="activity-user">
                              <span className="fw-semibold">{article.author?.name || 'Unknown'}</span>
                              <span className="text-muted mx-1">•</span>
                              <span className="text-muted small">{getTimeAgo(article.created_at)}</span>
                            </div>
                          </div>
                          <span className={`activity-status ${article.status === 'published' ? 'published' : 'draft'}`}>
                            {article.status === 'published' ? (
                              <i className="bi bi-check-circle-fill"></i>
                            ) : (
                              <i className="bi bi-pencil-fill"></i>
                            )}
                            {article.status}
                          </span>
                        </div>
                        <div className="activity-body">
                          <Link to={`/articles/${article.id}`} className="activity-link">
                            {article.title}
                          </Link>
                          <div className="activity-meta">
                            <span>
                              <i className="bi bi-eye me-1"></i>
                              {article.views || 0}
                            </span>
                            <span>
                              <i className="bi bi-heart me-1"></i>
                              {article.likes_count || 0}
                            </span>
                            <span>
                              <i className="bi bi-chat me-1"></i>
                              {article.comments_count || 0}
                            </span>
                            <span className="activity-category">
                              {article.category?.name || 'Uncategorized'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
            {latestArticles.length > 0 && (
              <Card.Footer className="bg-white border-top-0 text-center py-2">
                <Link to="/articles" className="text-decoration-none small">
                  View all activity <i className="bi bi-arrow-right"></i>
                </Link>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;