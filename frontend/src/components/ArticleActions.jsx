import React, { useState, useEffect } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import api from '../services/api';

const ArticleActions = ({ articleId, articleAuthorId }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Check if user liked the article
    checkLikeStatus();
  }, [articleId]);

  const checkLikeStatus = async () => {
    try {
      // We can check if the article has likes_count and user_liked from the article data
      // This is handled in the article fetch
    } catch (err) {
      console.error('Error checking like status:', err);
    }
  };

  const handleLike = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/articles/${articleId}/like`);
      setLiked(response.data.liked);
      setLikesCount(prev => response.data.liked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('Error liking article:', err);
      alert('Failed to like article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex gap-2 align-items-center">
      <Button
        variant={liked ? 'danger' : 'outline-danger'}
        size="sm"
        onClick={handleLike}
        disabled={loading}
        className="rounded-pill px-3"
      >
        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <>
            <i className={`bi ${liked ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
            {likesCount > 0 && <span>{likesCount}</span>}
          </>
        )}
      </Button>
    </div>
  );
};

export default ArticleActions;