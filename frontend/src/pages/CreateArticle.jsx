import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateArticle = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    status: 'draft'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      setError('');
      const response = await api.get('/categories');
      console.log('Categories response:', response.data);
      setCategories(response.data.categories || []);
      if (response.data.categories && response.data.categories.length > 0) {
        setFormData(prev => ({
          ...prev,
          category_id: response.data.categories[0].id
        }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      console.log('Creating article with data:', formData);
      const response = await api.post('/articles', formData);
      console.log('Create response:', response.data);
      setSuccess('Article created successfully!');
      setTimeout(() => {
        navigate('/my-articles');
      }, 1500);
    } catch (err) {
      console.error('Create article error:', err);
      console.error('Error response:', err.response?.data);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to create article. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCategories) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="p-4" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h3 className="fw-bold">Create New Article</h3>
        <p className="text-muted">Share your knowledge with the community</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Article Title</Form.Label>
          <Form.Control
            type="text"
            name="title"
            placeholder="Enter a descriptive title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Content</Form.Label>
          <Form.Control
            as="textarea"
            name="content"
            rows={10}
            placeholder="Write your article content here..."
            value={formData.content}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label>Status</Form.Label>
          <div className="d-flex gap-3">
            <Form.Check
              type="radio"
              label="Draft"
              name="status"
              value="draft"
              checked={formData.status === 'draft'}
              onChange={handleChange}
            />
            <Form.Check
              type="radio"
              label="Published"
              name="status"
              value="published"
              checked={formData.status === 'published'}
              onChange={handleChange}
            />
          </div>
        </Form.Group>

        <div className="d-flex gap-3">
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : 'Create Article'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate('/my-articles')}
          >
            Cancel
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default CreateArticle;