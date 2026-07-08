import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert, Card } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location]);

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
      const response = await api.post('/auth/login', formData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="justify-content-center w-100">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-box-arrow-in-right fs-2"></i>
                </div>
                <h2 className="fw-bold mt-3">Welcome Back</h2>
                <p className="text-muted">Sign in to continue to DevKB</p>
              </div>

              {success && <Alert variant="success" className="rounded-3">{success}</Alert>}
              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Email Address</Form.Label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                      <i className="bi bi-envelope"></i>
                    </span>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="ps-5 py-2"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Label className="fw-semibold">Password</Form.Label>
                    <Link to="/forgot-password" className="text-decoration-none small">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                      <i className="bi bi-lock"></i>
                    </span>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="ps-5 py-2"
                      style={{ borderRadius: '10px' }}
                    />
                    <button
                      type="button"
                      className="position-absolute top-50 end-0 translate-middle-y me-3 border-0 bg-transparent text-muted"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      <i className={`bi bi-eye${showPassword ? '' : '-slash'}`}></i>
                    </button>
                  </div>
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mb-3 py-2 fw-semibold rounded-pill"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i> Sign In
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <span className="text-muted">Don't have an account? </span>
                  <Link to="/register" className="text-decoration-none fw-semibold">
                    Sign Up
                  </Link>
                </div>

                <hr className="my-3" />

                <div className="text-center text-muted small">
                  <p className="mb-0">
                    <i className="bi bi-shield-check me-1"></i>
                    Secure login with JWT authentication
                  </p>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;