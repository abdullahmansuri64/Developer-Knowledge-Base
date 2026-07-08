import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import api from '../services/api';

const MyArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyArticles();
  }, []);

  const fetchMyArticles = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📡 Fetching my articles...');
      const response = await api.get('/articles/my');
      console.log('✅ My articles response:', response.data);
      
      setArticles(response.data.articles || []);
    } catch (err) {
      console.error('❌ Error fetching my articles:', err);
      console.error('❌ Error details:', err.response?.data);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      setError('Failed to load your articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) {
      return;
    }
    
    try {
      await api.delete(`/articles/${articleId}`);
      setArticles(articles.filter(a => a.id !== articleId));
    } catch (err) {
      alert('Failed to delete article. Please try again.');
      console.error('Error deleting article:', err);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold">My Articles</h3>
          <p className="text-muted">Manage your articles and drafts</p>
        </div>
        <Button as={Link} to="/create-article" variant="primary">
          <i className="bi bi-plus-circle me-2"></i> Create New
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {articles.length === 0 ? (
        <div className="empty-state py-5">
          <i className="bi bi-file-earmark display-4 text-muted d-block mb-3"></i>
          <h5 className="text-muted">No articles yet</h5>
          <p className="text-muted">Create your first article to share your knowledge</p>
          <Button as={Link} to="/create-article" variant="primary" className="mt-2">
            <i className="bi bi-plus-circle me-2"></i> Create Article
          </Button>
        </div>
      ) : (
        <Row className="g-4">
          {articles.map(article => (
            <Col key={article.id} md={6} lg={4}>
              <ArticleCard 
                article={{
                  ...article,
                  user_liked: article.user_liked || false,
                  likes_count: article.likes_count || 0,
                  comments_count: article.comments_count || 0
                }}
                showActions={true}
                onDelete={handleDelete}
              />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MyArticles;