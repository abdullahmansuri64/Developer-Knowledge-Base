import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Alert, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import api from '../services/api';

const Following = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingCount, setFollowingCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    fetchFollowingArticles();
    fetchFollowingCount();
  }, []);

  const fetchFollowingCount = async () => {
    try {
      // Try to get following count - this is just for display
      const response = await api.get('/follow/check/0');
      // This is just to check if the endpoint works
    } catch (err) {
      console.log('Following count check:', err.response?.status);
    }
  };

  const fetchFollowingArticles = async () => {
    try {
      setLoading(true);
      setError('');
      setDebugInfo('');
      
      console.log('📡 Fetching following articles...');
      
      const response = await api.get('/following-articles');
      console.log('✅ Following articles response:', response.data);
      
      if (response.data && response.data.articles) {
        setArticles(response.data.articles);
        setDebugInfo(`Found ${response.data.articles.length} articles`);
      } else {
        setArticles([]);
        setDebugInfo('No articles found');
      }
    } catch (err) {
      console.error('❌ Error fetching following articles:', err);
      console.error('❌ Error details:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      // Don't show error if it's just empty (user follows no one)
      if (err.response?.status === 404) {
        setDebugInfo('No articles from people you follow');
        setArticles([]);
        setError('');
      } else {
        setError('Failed to load articles from people you follow. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <div className="mb-4">
        <h3 className="fw-bold">
          <i className="bi bi-people-fill text-primary me-2"></i>
          Following Feed
        </h3>
        <p className="text-muted mb-0">Articles from people you follow</p>
        {debugInfo && <small className="text-muted">{debugInfo}</small>}
      </div>

      {error && (
        <Alert variant="danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchFollowingArticles}>
            <i className="bi bi-arrow-repeat me-1"></i> Retry
          </Button>
        </Alert>
      )}

      {articles.length === 0 && !error ? (
        <Card className="shadow-sm border-0 text-center py-5">
          <Card.Body>
            <i className="bi bi-people display-4 text-muted d-block mb-3"></i>
            <h5 className="text-muted">No articles from people you follow</h5>
            <p className="text-muted">
              Start following authors to see their articles here
            </p>
            <div className="d-flex gap-3 justify-content-center mt-3">
              <Button as={Link} to="/articles" variant="primary" className="rounded-pill px-4">
                <i className="bi bi-collection me-2"></i> Browse Articles
              </Button>
              <Button as={Link} to="/profile" variant="outline-primary" className="rounded-pill px-4">
                <i className="bi bi-person me-2"></i> Find Authors
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {articles.map(article => (
            <Col key={article.id} md={6} lg={4}>
              <ArticleCard article={article} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Following;