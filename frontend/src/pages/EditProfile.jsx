import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const EditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadingData(true);
      setError('');
      
      const response = await api.get('/users/profile');
      const user = response.data.user;
      setFormData({
        name: user.name || '',
        email: user.email || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError('Failed to load profile data');
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
      const response = await api.put('/users/profile', {
        name: formData.name
      });
      
      // Update local storage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.name = formData.name;
      localStorage.setItem('user', JSON.stringify(user));
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
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
    <Container className="py-4" style={{ maxWidth: '600px' }}>
      <Card className="profile-card shadow-sm border-0">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="profile-edit-avatar">
              {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h3 className="fw-bold mt-3">Edit Profile</h3>
            <p className="text-muted">Update your profile information</p>
          </div>

          {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
          {success && <Alert variant="success" className="rounded-3">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Full Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                className="py-2"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">Email Address</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                disabled
                className="py-2 bg-light"
              />
              <Form.Text className="text-muted">
                Email cannot be changed
              </Form.Text>
            </Form.Group>

            <div className="d-flex gap-3">
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading}
                className="rounded-pill px-4"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i> Update Profile
                  </>
                )}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/profile')}
                className="rounded-pill px-4"
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EditProfile;