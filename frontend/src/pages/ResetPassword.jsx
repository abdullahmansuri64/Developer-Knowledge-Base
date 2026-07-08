import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await api.get(`/auth/reset-password/${token}`);
      if (response.data.valid) {
        setValidToken(true);
      }
    } catch (err) {
      setError('Invalid or expired reset link. Please request a new one.');
    } finally {
      setVerifying(false);
    }
  };

  const generatePassword = async () => {
    try {
      const response = await api.get('/auth/generate-password');
      const generatedPassword = response.data.password;
      setNewPassword(generatedPassword);
      setConfirmPassword(generatedPassword);
    } catch (err) {
      setError('Failed to generate password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Container fluid className="bg-light min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Verifying your reset link...</p>
        </div>
      </Container>
    );
  }

  if (!validToken) {
    return (
      <Container fluid className="bg-light min-vh-100 d-flex align-items-center">
        <Row className="justify-content-center w-100">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-4 p-md-5 text-center">
                <div className="mb-4">
                  <i className="bi bi-exclamation-circle text-danger display-1"></i>
                </div>
                <h3 className="fw-bold">Invalid Reset Link</h3>
                <p className="text-muted">
                  This password reset link is invalid or has expired.
                </p>
                <Link to="/forgot-password" className="btn btn-primary mt-3">
                  Request New Link
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="bg-light min-vh-100 d-flex align-items-center">
      <Row className="justify-content-center w-100">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-key fs-2"></i>
                </div>
                <h2 className="fw-bold mt-3">Reset Password</h2>
                <p className="text-muted">Create your new password</p>
              </div>

              {success ? (
                <Alert variant="success" className="rounded-3 text-center">
                  <i className="bi bi-check-circle-fill fs-1 text-success d-block mb-3"></i>
                  <h5>Password Reset Successfully!</h5>
                  <p className="mb-0">Redirecting to login...</p>
                </Alert>
              ) : (
                <Form onSubmit={handleSubmit}>
                  {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}

                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label className="fw-semibold">New Password</Form.Label>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-primary p-0 text-decoration-none"
                        onClick={generatePassword}
                        type="button"
                      >
                        <i className="bi bi-magic me-1"></i> Generate
                      </Button>
                    </div>
                    <InputGroup>
                      <InputGroup.Text><i className="bi bi-lock"></i></InputGroup.Text>
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={loading}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                        disabled={loading}
                      >
                        <i className={`bi bi-eye${showPassword ? '' : '-slash'}`}></i>
                      </Button>
                    </InputGroup>
                    <small className="text-muted">Minimum 6 characters</small>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                    <InputGroup>
                      <InputGroup.Text><i className="bi bi-shield-lock"></i></InputGroup.Text>
                      <Form.Control
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        type="button"
                        disabled={loading}
                      >
                        <i className={`bi bi-eye${showConfirmPassword ? '' : '-slash'}`}></i>
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 mb-3 py-2 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i> Reset Password
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Link to="/login" className="text-decoration-none">
                      <i className="bi bi-arrow-left me-1"></i> Back to Login
                    </Link>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;