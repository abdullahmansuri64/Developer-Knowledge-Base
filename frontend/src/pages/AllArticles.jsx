import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Alert, InputGroup, FormControl, Button } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import api from '../services/api';

const AllArticles = () => {
  const location = useLocation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category) {
      setSelectedCategory(category.toLowerCase());
    } else {
      setSelectedCategory('');
    }
  }, [location]);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [searchTerm, articles, selectedCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📡 Fetching articles...');
      const response = await api.get('/articles');
      console.log('✅ Articles response:', response.data);
      
      setArticles(response.data.articles || []);
      setFilteredArticles(response.data.articles || []);
    } catch (err) {
      console.error('❌ Error fetching articles:', err);
      console.error('❌ Error details:', err.response?.data);
      
      if (err.response?.status === 401) {
        setError('Your session has expired. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Failed to load articles. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (selectedCategory) {
      filtered = filtered.filter(article => 
        article.category?.name?.toLowerCase() === selectedCategory
      );
    }

    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(article => 
        article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredArticles(filtered);
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
        <h3 className="fw-bold mb-1">
          {selectedCategory ? (
            <>
              <i className="bi bi-tag-fill text-primary me-2"></i>
              {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Articles
            </>
          ) : (
            <>
              <i className="bi bi-collection-fill text-primary me-2"></i>
              All Articles
            </>
          )}
        </h3>
        <p className="text-muted mb-0">
          {selectedCategory 
            ? `Browse articles in ${selectedCategory} category` 
            : 'Explore knowledge from the developer community'}
        </p>
      </div>

      <div className="search-section mb-4">
        <div className="d-flex gap-2">
          <InputGroup style={{ maxWidth: '500px' }}>
            <InputGroup.Text className="bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </InputGroup.Text>
            <FormControl
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-start-0"
              style={{ borderRadius: '0 10px 10px 0' }}
            />
          </InputGroup>
          <Button 
            variant="outline-secondary" 
            onClick={fetchArticles}
            className="rounded-pill px-3"
          >
            <i className="bi bi-arrow-repeat"></i>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="rounded-3 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchArticles}>
            Retry
          </Button>
        </Alert>
      )}

      {!error && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="text-muted small">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {filteredArticles.length === 0 && !error ? (
        <div className="empty-state py-5">
          <i className="bi bi-collection display-1 text-muted d-block mb-3"></i>
          <h5 className="text-muted">No articles found</h5>
          <p className="text-muted">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : selectedCategory 
                ? `No articles found in ${selectedCategory} category` 
                : 'Articles will appear here once published'}
          </p>
        </div>
      ) : (
        <Row className="g-4">
          {filteredArticles.map(article => (
            <Col key={article.id} md={6} lg={4}>
              <ArticleCard 
                article={{
                  ...article,
                  user_liked: article.user_liked || false,
                  likes_count: article.likes_count || 0,
                  comments_count: article.comments_count || 0
                }} 
              />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default AllArticles;