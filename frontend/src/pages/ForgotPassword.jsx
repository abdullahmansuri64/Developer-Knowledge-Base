import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState('');

  // ============================================================
  // ⭐ GENERATE PASSWORD FUNCTION
  // ============================================================
  const generatePassword = async () => {
    try {
      const response = await api.get('/auth/generate-password');
      const generatedPassword = response.data.password;
      
      setNewPassword(generatedPassword);
      setConfirmPassword(generatedPassword);
      checkPasswordStrength(generatedPassword);
      
      setSuccess('✅ Strong password generated!');
      
      // Auto copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(generatedPassword);
        setSuccess('✅ Password copied to clipboard!');
      }
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      // Fallback: Generate locally
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setNewPassword(password);
      setConfirmPassword(password);
      checkPasswordStrength(password);
      setSuccess('✅ Password generated!');
      setTimeout(() => setSuccess(''), 3000);
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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      console.log('OTP Response:', response.data);
      
      if (response.data.otp) {
        setSuccess(`OTP: ${response.data.otp} (Check your email)`);
        setStep(2);
        setTimer(60);
        startTimer();
      } else {
        setSuccess('OTP sent to your email! Please check your inbox.');
        setStep(2);
        setTimer(60);
        startTimer();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      setResetToken(response.data.reset_token);
      setSuccess('OTP verified successfully!');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
        reset_token: resetToken,
        new_password: newPassword
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successfully! Please login with your new password.' } });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess('OTP resent!');
      setTimer(60);
      startTimer();
    } catch (err) {
      setError('Failed to resend OTP');
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
                <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-key fs-2"></i>
                </div>
                <h2 className="fw-bold mt-3">
                  {step === 1 && 'Forgot Password'}
                  {step === 2 && 'Verify OTP'}
                  {step === 3 && 'Reset Password'}
                </h2>
                <p className="text-muted">
                  {step === 1 && 'Enter your email to receive OTP'}
                  {step === 2 && 'Enter the 6-digit code sent to your email'}
                  {step === 3 && 'Create your new password'}
                </p>
              </div>

              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
              {success && <Alert variant="success" className="rounded-3">{success}</Alert>}

              {step === 1 && (
                <Form onSubmit={handleSendOTP}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Email Address</Form.Label>
                    <InputGroup className="shadow-sm">
                      <InputGroup.Text className="bg-white border-end-0">
                        <i className="bi bi-envelope text-primary"></i>
                      </InputGroup.Text>
                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="border-start-0"
                        style={{ borderRadius: '0 10px 10px 0' }}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2 fw-semibold rounded-pill"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope-paper me-2"></i> Send OTP
                      </>
                    )}
                  </Button>
                </Form>
              )}

              {step === 2 && (
                <Form onSubmit={handleVerifyOTP}>
                  <div className="text-center mb-3">
                    <div className="bg-light p-3 rounded-3">
                      <p className="text-muted mb-0">
                        OTP sent to <strong>{email}</strong>
                      </p>
                      {timer > 0 && (
                        <span className="badge bg-primary mt-2">
                          <i className="bi bi-clock me-1"></i> {timer}s
                        </span>
                      )}
                      {timer === 0 && (
                        <Button
                          variant="link"
                          className="text-primary p-0 mt-2 d-block"
                          onClick={resendOTP}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-repeat me-1"></i> Resend OTP
                        </Button>
                      )}
                    </div>
                  </div>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Enter OTP</Form.Label>
                    <InputGroup className="shadow-sm">
                      <InputGroup.Text className="bg-white border-end-0">
                        <i className="bi bi-shield-lock text-primary"></i>
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        disabled={loading}
                        className="border-start-0 text-center"
                        style={{ borderRadius: '0 10px 10px 0', fontSize: '20px', letterSpacing: '4px' }}
                        maxLength={6}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2 fw-semibold rounded-pill"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Verifying OTP...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i> Verify OTP
                      </>
                    )}
                  </Button>
                </Form>
              )}

              {step === 3 && (
                <Form onSubmit={handleResetPassword}>
                  <div className="text-center mb-3">
                    <div className="bg-success bg-opacity-10 p-3 rounded-3">
                      <p className="text-success mb-0">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        OTP verified! Create your new password.
                      </p>
                    </div>
                  </div>

                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label className="fw-semibold">New Password</Form.Label>
                      {/* ⭐ GENERATE PASSWORD BUTTON */}
                      <Button
                        type="button"
                        variant="outline-primary"
                        size="sm"
                        onClick={generatePassword}
                        disabled={loading}
                        className="rounded-pill px-3"
                      >
                        <i className="bi bi-magic me-1"></i> Generate
                      </Button>
                    </div>
                    <div className="position-relative">
                      <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                        <i className="bi bi-lock text-primary"></i>
                      </span>
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          checkPasswordStrength(e.target.value);
                        }}
                        required
                        minLength={6}
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

                    {/* Password Strength Indicator */}
                    {newPassword && (
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
                        <i className="bi bi-shield-lock text-primary"></i>
                      </span>
                      <Form.Control
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                    className="w-100 py-2 fw-semibold rounded-pill"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i> Reset Password
                      </>
                    )}
                  </Button>
                </Form>
              )}

              <div className="text-center mt-3">
                <Link to="/login" className="text-decoration-none small">
                  <i className="bi bi-arrow-left me-1"></i> Back to Login
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPassword;