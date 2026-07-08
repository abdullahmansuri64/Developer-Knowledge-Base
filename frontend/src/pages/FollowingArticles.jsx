import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import api from '../services/api';

const FollowingArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noFollowing, setNoFollowing] = useState(false);

  useEffect(() => {
    fetchFollowingArticles();
  }, []);

  const fetchFollowingArticles = async () => {
    try {
      setLoading(true);
      setError('');
      setNoFollowing(false);
      
      console.log('Fetching following articles...');
      
      const response = await api.get('/following-articles');
      console.log('Following articles response:', response.data);
      
      if (response.data.articles) {
        setArticles(response.data.articles);
        if (response.data.articles.length === 0) {
          // Check if user follows anyone
          try {
            const followCheck = await api.get('/follow/check/0');
            // This is just to check if the endpoint works
          } catch (err) {
            if (err.response?.status === 404) {
              setNoFollowing(true);
            }
          }
        }
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error('Error fetching following articles:', err);
      console.error('Error details:', err.response?.data);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      setError('Failed to load articles from people you follow. Please try again.');
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
        <p className="text-muted">Articles from people you follow</p>
      </div>

      {error && (
        <Alert variant="danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchFollowingArticles}>
            Retry
          </Button>
        </Alert>
      )}

      {articles.length === 0 && !error ? (
        <div className="empty-state py-5">
          <i className="bi bi-people display-4 text-muted d-block mb-3"></i>
          <h5 className="text-muted">No articles from people you follow</h5>
          <p className="text-muted">
            Start following authors to see their articles here
          </p>
          <div className="d-flex gap-3 justify-content-center mt-3">
            <Button as={Link} to="/articles" variant="primary">
              <i className="bi bi-collection me-2"></i> Browse Articles
            </Button>
            <Button as={Link} to="/profile" variant="outline-primary">
              <i className="bi bi-person me-2"></i> Find Authors
            </Button>
          </div>
        </div>
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

export default FollowingArticles;