import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import ArticleCard from '../components/ArticleCard';
import api from '../services/api';

const SavedArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedArticles();
  }, []);

  const fetchSavedArticles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/saved-articles');
      setArticles(response.data.saved_articles || []);
    } catch (err) {
      console.error('Error fetching saved articles:', err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      setError('Failed to load saved articles');
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
          <i className="bi bi-bookmark-fill text-warning me-2"></i>
          Saved Articles
        </h3>
        <p className="text-muted">Articles you have bookmarked</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {articles.length === 0 ? (
        <div className="empty-state py-5">
          <i className="bi bi-bookmark display-4 text-muted d-block mb-3"></i>
          <h5 className="text-muted">No saved articles</h5>
          <p className="text-muted">Start saving articles you want to read later</p>
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

export default SavedArticles;