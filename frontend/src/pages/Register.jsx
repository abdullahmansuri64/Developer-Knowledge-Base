import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Alert, Card, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = '';
    if (password.length === 0) {
      strength = '';
    } else if (password.length < 6) {
      strength = 'Weak';
    } else if (password.length < 10) {
      strength = 'Medium';
    } else {
      strength = 'Strong';
    }
    setPasswordStrength(strength);
  };

  const getStrengthColor = () => {
    if (passwordStrength === 'Weak') return '#dc3545';
    if (passwordStrength === 'Medium') return '#ffc107';
    if (passwordStrength === 'Strong') return '#198754';
    return '#6c757d';
  };

  const generatePassword = async () => {
    try {
      const response = await api.get('/auth/generate-password');
      const generatedPassword = response.data.password;
      setFormData({
        ...formData,
        password: generatedPassword,
        confirmPassword: generatedPassword
      });
      checkPasswordStrength(generatedPassword);
      setSuccess('Strong password generated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to generate password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validation
    if (formData.name.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Remove confirmPassword before sending
      const { confirmPassword, ...userData } = formData;
      
      console.log('Sending registration data:', userData); // Debug log
      
      const response = await api.post('/auth/register', userData);
      
      console.log('Registration response:', response.data); // Debug log
      
      // If token is returned, auto-login
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      } else {
        // Otherwise redirect to login
        navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
      }
    } catch (err) {
      console.error('Registration error:', err); // Debug log
      console.error('Error response:', err.response?.data); // Debug log
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 409) {
        setError('Email already registered. Please use a different email.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Registration failed. Please try again.');
      }
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
                  <i className="bi bi-person-plus fs-2"></i>
                </div>
                <h2 className="fw-bold mt-3">Create Account</h2>
                <p className="text-muted">Join Developer Knowledge Base</p>
              </div>

              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
              {success && <Alert variant="success" className="rounded-3">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Full Name</Form.Label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                      <i className="bi bi-person"></i>
                    </span>
                    <Form.Control
                      type="text"
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="ps-5 py-2"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                </Form.Group>

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
                    <button
                      type="button"
                      className="btn btn-link text-decoration-none p-0"
                      onClick={generatePassword}
                      disabled={loading}
                    >
                      <i className="bi bi-magic me-1"></i> Generate
                    </button>
                  </div>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                      <i className="bi bi-lock"></i>
                    </span>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      minLength={6}
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
                  
                  {formData.password && (
                    <div className="mt-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Strength:</span>
                        <div className="flex-grow-1" style={{ height: '4px', background: '#e9ecef', borderRadius: '2px' }}>
                          <div 
                            style={{ 
                              width: passwordStrength === 'Weak' ? '33%' : passwordStrength === 'Medium' ? '66%' : '100%',
                              height: '100%',
                              background: getStrengthColor(),
                              borderRadius: '2px',
                              transition: 'all 0.3s'
                            }}
                          ></div>
                        </div>
                        <span style={{ color: getStrengthColor(), fontSize: '12px', fontWeight: '600' }}>
                          {passwordStrength}
                        </span>
                      </div>
                      <small className="text-muted">Minimum 6 characters</small>
                    </div>
                  )}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                      <i className="bi bi-shield-lock"></i>
                    </span>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="ps-5 py-2"
                      style={{ borderRadius: '10px' }}
                    />
                    <button
                      type="button"
                      className="position-absolute top-50 end-0 translate-middle-y me-3 border-0 bg-transparent text-muted"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      <i className={`bi bi-eye${showConfirmPassword ? '' : '-slash'}`}></i>
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i> Create Account
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <span className="text-muted">Already have an account? </span>
                  <Link to="/login" className="text-decoration-none fw-semibold">
                    Sign In
                  </Link>
                </div>

                <hr className="my-3" />

                <div className="text-center text-muted small">
                  <p className="mb-0">
                    <i className="bi bi-shield-check me-1"></i>
                    By creating an account, you agree to our Terms of Service
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

export default Register;