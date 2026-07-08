// frontend/src/pages/AIChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Container, Card, Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AIChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);
  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Get today's date
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Load saved chat from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai_chat_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        setMessages([]);
      }
    }
  }, []);

  // Save chat to localStorage when it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Add user message to chat
    const userMessage = { 
      sender: 'user', 
      text: trimmedInput,
      timestamp: new Date().toLocaleTimeString()
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/chat', { 
        message: trimmedInput,
        history: updatedMessages
      });
      
      if (response.data.context) {
        setContext(response.data.context);
      }
      
      const aiMessage = { 
        sender: 'ai', 
        text: response.data.response || "I don't have that information in the database.",
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (err) {
      console.error('Chat error:', err);
      let errorMsg = 'Failed to get AI response. ';
      if (err.response?.data?.error) {
        errorMsg += err.response.data.error;
      } else {
        errorMsg += 'Please try again.';
      }
      setError(errorMsg);
      
      const errorMessage = { 
        sender: 'ai', 
        text: '⚠️ Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat?')) {
      setMessages([]);
      setContext(null);
      setError('');
      localStorage.removeItem('ai_chat_messages');
      sessionStorage.removeItem('ai_chat_context');
    }
  };

  const suggestedQuestions = [
    "How many users are registered?",
    "How many articles did khatri write?",
    "What is khatri's latest article?",
    "How many views does khatri's article have?",
    "How many likes does khatri's article have?",
    "Who follows whom?",
    "Who saved which articles?",
    "Which article has the most comments?",
    "Give me all article titles",
    "What is the content of the latest article?",
    "Today any articles is upload?",
    "What is today's date?",
  ];

  const handleSuggestionClick = (question) => {
    setInput(question);
  };

  return (
    <Container fluid className="p-4" style={{ maxWidth: '1000px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-robot text-primary me-2"></i>
            AI Assistant
          </h3>
          <p className="text-muted mb-0">
            Ask me ANYTHING about your project data!
            <span className="ms-2 badge bg-success">💬 Memory: ON</span>
            <span className="ms-2 badge bg-info">📅 {todayFormatted}</span>
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {messages.length > 0 && (
            <Button 
              variant="outline-danger" 
              size="sm" 
              className="rounded-pill"
              onClick={clearChat}
            >
              <i className="bi bi-trash me-1"></i> Clear Chat
            </Button>
          )}
          <span className="badge bg-success rounded-pill px-3 py-2">
            <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>
            Online
          </span>
          <span className="badge bg-primary rounded-pill px-3 py-2">
            <i className="bi bi-robot me-1"></i>
            llama3.2
          </span>
          {context && (
            <span className="badge bg-info rounded-pill px-3 py-2">
              <i className="bi bi-database me-1"></i>
              {context.users} Users | {context.articles} Articles | {context.comments} Comments
            </span>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-0 overflow-hidden">
        <Card.Body className="p-0">
          <div 
            className="chat-messages p-4" 
            style={{ 
              height: '500px', 
              overflowY: 'auto',
              background: 'var(--bg-color)'
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-robot display-1 d-block mb-3 text-primary opacity-50"></i>
                <h5>Welcome to AI Assistant!</h5>
                <p className="mb-3">Ask me ANYTHING about your project data. I remember our conversation! 🧠</p>
                <p className="mb-3 text-primary">📅 Today is {todayFormatted}</p>
                
                <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                  {suggestedQuestions.map((q, idx) => (
                    <Button
                      key={idx}
                      variant="outline-secondary"
                      size="sm"
                      className="rounded-pill"
                      onClick={() => handleSuggestionClick(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  <div 
                    className={`p-3 rounded-3 ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white' 
                        : msg.isError 
                          ? 'bg-danger bg-opacity-10 border border-danger' 
                          : 'bg-white border shadow-sm'
                    }`}
                    style={{ maxWidth: '80%' }}
                  >
                    {msg.sender === 'user' ? (
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="bi bi-person-circle"></i>
                        <span className="fw-semibold">{user.name || 'You'}</span>
                        <span className="opacity-50 small">{msg.timestamp}</span>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="bi bi-robot text-primary"></i>
                        <span className="fw-semibold text-primary">AI Assistant</span>
                        <span className="text-muted small">{msg.timestamp}</span>
                      </div>
                    )}
                    <div className={msg.sender === 'user' ? '' : 'text-dark'}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="d-flex justify-content-start mb-3">
                <div className="bg-white border shadow-sm p-3 rounded-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <span className="ms-2 text-muted">Reading database...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-top p-3 bg-white">
            {error && (
              <Alert variant="danger" className="mb-2 py-2 rounded-pill">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </Alert>
            )}
            <Form onSubmit={handleSend} className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Ask me ANYTHING about your project..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="rounded-pill py-2"
              />
              <Button 
                type="submit" 
                variant="primary" 
                className="rounded-pill px-4"
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <i className="bi bi-send"></i> Send
                  </>
                )}
              </Button>
            </Form>
          </div>
        </Card.Body>
      </Card>

      <div className="mt-3 text-center text-muted small">
        <i className="bi bi-info-circle me-1"></i>
        AI reads EXACT data from your database - no fake numbers!
        <span className="mx-2">•</span>
        <i className="bi bi-shield-check me-1"></i>
        Chat remembers previous messages! 🧠
        <span className="mx-2">•</span>
        <i className="bi bi-calendar-check me-1"></i>
        📅 Today is {todayFormatted}
      </div>
    </Container>
  );
};

export default AIChat;