import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Spinner, Alert, Button, Row, Col } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import DownloadButton from '../components/DownloadButton';
import CommentSection from '../components/CommentSection';
import SaveButton from '../components/SaveButton';
import FollowButton from '../components/FollowButton';

const ViewArticle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (id) {
      fetchArticle();
      checkSaved();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📡 Fetching article with ID:', id);
      
      const response = await api.get(`/articles/${id}`);
      console.log('✅ Article response:', response.data);
      
      const data = response.data.article;
      
      if (!data) {
        setError('Article not found');
        setLoading(false);
        return;
      }
      
      setArticle(data);
      setLikesCount(data.likes_count || 0);
      setUserLiked(data.user_liked || false);
      setIsOwner(data.author?.id === user.id);
      
    } catch (err) {
      console.error('❌ Error fetching article:', err);
      console.error('❌ Error details:', err.response?.data);
      
      if (err.response?.status === 404) {
        setError('Article not found');
      } else if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      } else {
        setError('Failed to load article. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSaved = async () => {
    try {
      const response = await api.get(`/saved-articles/${id}`);
      setIsSaved(response.data.saved || false);
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleLike = async () => {
    if (liking) return;
    
    setLiking(true);
    try {
      const response = await api.post(`/articles/${id}/like`);
      if (response.data.liked) {
        setLikesCount(likesCount + 1);
        setUserLiked(true);
      } else {
        setLikesCount(likesCount - 1);
        setUserLiked(false);
      }
    } catch (error) {
      console.error('❌ Error liking article:', error);
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this article?')) {
      return;
    }
    try {
      await api.delete(`/articles/${id}`);
      navigate('/my-articles');
    } catch (err) {
      alert('Failed to delete article. Please try again.');
    }
  };

  // ============================================================
  // ⭐ GET INITIALS - FIXED
  // ============================================================
  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // ============================================================
  // ⭐ GET AVATAR COLOR - FIXED
  // ============================================================
  const getAvatarColor = (name) => {
    if (!name) return '#4F46E5';
    
    const colors = [
      '#4F46E5', '#7C3AED', '#EC4899', '#EF4444',
      '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
      '#8B5CF6', '#D946EF', '#F43F5E', '#14B8A6'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Just now';
    try {
      const now = new Date();
      const diff = Math.floor((now - new Date(date)) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return `${Math.floor(diff / 604800)}w ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger" className="rounded-3">
          <div className="d-flex align-items-start">
            <i className="bi bi-exclamation-triangle-fill fs-3 me-3 text-danger"></i>
            <div>
              <h5 className="mb-1">Error</h5>
              <p className="mb-0">{error}</p>
            </div>
          </div>
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate('/articles')}>
              <i className="bi bi-arrow-left me-2"></i> Browse Articles
            </Button>
            <Button variant="outline-secondary" className="ms-2" onClick={fetchArticle}>
              <i className="bi bi-arrow-repeat me-2"></i> Retry
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!article) {
    return (
      <Container className="py-4">
        <Alert variant="warning" className="rounded-3">
          <div className="d-flex align-items-start">
            <i className="bi bi-info-circle-fill fs-3 me-3 text-warning"></i>
            <div>
              <h5 className="mb-1">Article Not Found</h5>
              <p className="mb-0">The article you're looking for doesn't exist or has been removed.</p>
            </div>
          </div>
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate('/articles')}>
              <i className="bi bi-arrow-left me-2"></i> Browse Articles
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  const hasContent = article.content && typeof article.content === 'string';
  const avatarColor = getAvatarColor(article.author?.name);
  const authorInitials = getInitials(article.author?.name);

  return (
    <Container className="py-4" style={{ maxWidth: '950px' }}>
      {/* Article Card */}
      <Card className="view-article-card">
        <Card.Body className="p-4 p-md-5">
          {/* Top Section - Category & Actions */}
          <div className="view-article-top mb-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div className="d-flex gap-2 flex-wrap">
                {article.category && (
                  <span className="category-pill">
                    <i className="bi bi-tag me-1"></i>
                    {article.category.name}
                  </span>
                )}
                <span className={`status-pill status-${article.status || 'draft'}`}>
                  {article.status === 'published' ? (
                    <i className="bi bi-check-circle me-1"></i>
                  ) : (
                    <i className="bi bi-pencil me-1"></i>
                  )}
                  {article.status || 'draft'}
                </span>
              </div>
              <div className="d-flex gap-2">
                <SaveButton articleId={article.id} isSaved={isSaved} onToggle={() => setIsSaved(!isSaved)} />
                <DownloadButton articleId={article.id} title={article.title || 'Article'} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="view-article-title">{article.title || 'Untitled'}</h1>

          {/* ⭐ Author Section with Fixed Avatar */}
          <div className="view-article-author mb-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center">
                {/* ⭐ FIXED: Author Avatar with color and initials */}
                <div 
                  className="author-avatar-lg me-3"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'white',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)`,
                    boxShadow: `0 4px 12px ${avatarColor}40`
                  }}
                >
                  {authorInitials}
                </div>
                <div>
                  <div className="author-name-lg">{article.author?.name || 'Unknown'}</div>
                  <div className="author-meta">
                    <span>
                      <i className="bi bi-calendar3 me-1"></i>
                      {article.created_at ? new Date(article.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown date'}
                    </span>
                    <span className="mx-2">·</span>
                    <span>
                      <i className="bi bi-clock me-1"></i>
                      {getTimeAgo(article.created_at)}
                    </span>
                    <span className="mx-2">·</span>
                    <span>
                      <i className="bi bi-eye me-1"></i>
                      {article.views || 0} views
                    </span>
                  </div>
                </div>
              </div>
              {article.author?.id !== user.id && (
                <FollowButton userId={article.author?.id} />
              )}
            </div>
          </div>

          <hr className="view-article-divider" />

          {/* Article Content */}
          <div className="view-article-content">
            {hasContent ? (
              article.content.split('\n').map((paragraph, index) => {
                if (!paragraph || paragraph.trim() === '') {
                  return <br key={index} />;
                }
                if (paragraph.startsWith('# ')) {
                  return <h1 key={index}>{paragraph.substring(2)}</h1>;
                }
                if (paragraph.startsWith('## ')) {
                  return <h2 key={index}>{paragraph.substring(3)}</h2>;
                }
                if (paragraph.startsWith('### ')) {
                  return <h3 key={index}>{paragraph.substring(4)}</h3>;
                }
                if (paragraph.startsWith('- ')) {
                  return <li key={index}>{paragraph.substring(2)}</li>;
                }
                if (paragraph.startsWith('> ')) {
                  return <blockquote key={index}>{paragraph.substring(2)}</blockquote>;
                }
                if (paragraph.startsWith('```')) {
                  return <pre key={index}><code>{paragraph.replace(/```/g, '')}</code></pre>;
                }
                return <p key={index}>{paragraph}</p>;
              })
            ) : (
              <p className="text-muted">No content available for this article.</p>
            )}
          </div>

          {/* Like Button */}
          <div className="d-flex gap-3 mt-4 pt-3 border-top">
            <button
              className={`btn-like ${userLiked ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={liking}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: userLiked ? '#ef4444' : '#6b7280',
                fontSize: '1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'} fs-4`}></i>
              <span className="fw-bold">{likesCount > 0 && likesCount}</span>
              <span className="text-muted small">{likesCount === 1 ? 'Like' : 'Likes'}</span>
            </button>
          </div>

          {/* Owner Actions */}
          {isOwner && (
            <div className="view-article-actions mt-4 pt-4">
              <div className="d-flex gap-3 flex-wrap">
                <Button 
                  as={Link} 
                  to={`/edit-article/${article.id}`}
                  variant="primary"
                  className="rounded-pill px-4"
                >
                  <i className="bi bi-pencil me-2"></i> Edit Article
                </Button>
                <Button 
                  variant="outline-danger"
                  onClick={handleDelete}
                  className="rounded-pill px-4"
                >
                  <i className="bi bi-trash me-2"></i> Delete Article
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Stats Row */}
      <Row className="g-3 mt-2">
        <Col md={4}>
          <div className="stat-mini-card">
            <i className="bi bi-eye text-primary"></i>
            <div>
              <div className="stat-mini-value">{article.views || 0}</div>
              <div className="stat-mini-label">Total Views</div>
            </div>
          </div>
        </Col>
        <Col md={4}>
          <div className="stat-mini-card">
            <i className="bi bi-heart text-danger"></i>
            <div>
              <div className="stat-mini-value">{likesCount || 0}</div>
              <div className="stat-mini-label">Total Likes</div>
            </div>
          </div>
        </Col>
        <Col md={4}>
          <div className="stat-mini-card">
            <i className="bi bi-chat text-success"></i>
            <div>
              <div className="stat-mini-value">{article.comments_count || 0}</div>
              <div className="stat-mini-label">Total Comments</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Comments Section */}
      {article && <CommentSection articleId={article.id} />}
    </Container>
  );
};

export default ViewArticle;