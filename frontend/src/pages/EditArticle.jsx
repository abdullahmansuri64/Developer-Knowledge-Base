import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const EditArticle = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    status: 'draft'
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      setError('');

      // Fetch categories
      const categoriesRes = await api.get('/categories');
      setCategories(categoriesRes.data.categories || []);

      // Fetch article
      const articleRes = await api.get(`/articles/${id}`);
      const article = articleRes.data.article;

      setFormData({
        title: article.title,
        content: article.content,
        category_id: article.category?.id || '',
        status: article.status
      });

    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to edit this article');
      } else if (err.response?.status === 404) {
        setError('Article not found');
      } else if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      } else {
        setError('Failed to load article data');
      }
    } finally {
      setLoadingData(false);
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
      await api.put(`/articles/${id}`, formData);
      setSuccess('Article updated successfully!');
      setTimeout(() => {
        navigate('/my-articles');
      }, 1500);
    } catch (err) {
      console.error('Update error:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to edit this article');
      } else if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      } else {
        setError(err.response?.data?.error || 'Failed to update article. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="p-4" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h3 className="fw-bold">Edit Article</h3>
        <p className="text-muted">Update your article content</p>
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
                Updating...
              </>
            ) : 'Update Article'}
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

export default EditArticle;