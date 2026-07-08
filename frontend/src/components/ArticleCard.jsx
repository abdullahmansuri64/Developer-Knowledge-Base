import React, { useState } from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SaveButton from './SaveButton';
import api from '../services/api';

const ArticleCard = ({ article, showActions = false, onDelete }) => {
  const [likesCount, setLikesCount] = useState(article?.likes_count || 0);
  const [userLiked, setUserLiked] = useState(article?.user_liked || false);
  const [liking, setLiking] = useState(false);

  // Safely access article properties
  if (!article) {
    return null;
  }

  const getStatusColor = (status) => {
    return status === 'published' ? 'success' : 'warning';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
  };

  const handleLike = async () => {
    if (liking) return;
    
    setLiking(true);
    try {
      const response = await api.post(`/articles/${article.id}/like`);
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

  return (
    <Card className="article-card h-100">
      {/* Card Header - Category & Status */}
      <div className="article-card-header">
        <div className="d-flex justify-content-between align-items-center">
          {article.category && (
            <Badge bg="light" text="dark" className="category-badge">
              {article.category.name}
            </Badge>
          )}
          <Badge bg={getStatusColor(article.status)} className="status-badge">
            {article.status}
          </Badge>
        </div>
      </div>

      <Card.Body className="article-card-body">
        {/* Title - Clickable */}
        <Card.Title className="article-title">
          <Link to={`/articles/${article.id}`} className="text-decoration-none">
            {article.title || 'Untitled'}
          </Link>
        </Card.Title>

        {/* Content Preview */}
        <Card.Text className="article-preview">
          {article.content && article.content.length > 150 
            ? `${article.content.substring(0, 150)}...` 
            : article.content || 'No content'}
        </Card.Text>

        {/* Meta Info */}
        <div className="article-meta">
          <div className="d-flex align-items-center">
            <div className="avatar-circle-sm me-2" style={{ width: '28px', height: '28px', fontSize: '10px' }}>
              {getInitials(article.author?.name)}
            </div>
            <div>
              <span className="author-name">{article.author?.name || 'Unknown'}</span>
              <span className="article-date">{getTimeAgo(article.created_at)}</span>
            </div>
          </div>
        </div>
      </Card.Body>

      {/* Card Footer - Actions */}
      <div className="article-card-footer">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            {/* Like Button */}
            <button
              className={`btn-like ${userLiked ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={liking}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: userLiked ? '#ef4444' : '#6b7280',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              <span>{likesCount > 0 && likesCount}</span>
            </button>
            <span className="article-stats">
              <i className="bi bi-eye me-1"></i> {article.views || 0}
            </span>
            <span className="article-stats">
              <i className="bi bi-chat me-1"></i> {article.comments_count || 0}
            </span>
          </div>
          <SaveButton articleId={article.id} isSaved={false} />
        </div>

        {showActions && (
          <div className="article-actions mt-3 pt-2 border-top">
            <div className="d-flex gap-2">
              <Button 
                as={Link} 
                to={`/edit-article/${article.id}`}
                variant="outline-primary" 
                size="sm"
                className="rounded-pill px-3"
              >
                <i className="bi bi-pencil me-1"></i> Edit
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => onDelete && onDelete(article.id)}
                className="rounded-pill px-3"
              >
                <i className="bi bi-trash me-1"></i> Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ArticleCard;