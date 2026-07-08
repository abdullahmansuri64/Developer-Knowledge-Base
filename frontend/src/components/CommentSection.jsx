import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import api from '../services/api';

const CommentSection = ({ articleId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (articleId) {
      fetchComments();
    }
  }, [articleId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📡 Fetching comments for article:', articleId);
      const response = await api.get(`/articles/${articleId}/comments`);
      console.log('✅ Comments response:', response.data);
      
      setComments(response.data.comments || []);
    } catch (err) {
      console.error('❌ Error fetching comments:', err);
      console.error('❌ Error details:', err.response?.data);
      
      if (err.response?.status === 404 || err.response?.status === 500) {
        setComments([]);
        setError('');
      } else {
        setError('Failed to load comments');
      }
    } finally {
      setLoading(false);
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      console.log('📝 Adding comment:', newComment);
      const response = await api.post('/comments', {
        content: newComment,
        article_id: articleId
      });
      console.log('✅ Comment added:', response.data);
      
      // Add user data to the new comment
      const newCommentData = response.data.comment;
      newCommentData.user = {
        id: user.id,
        name: user.name
      };
      
      setComments([...comments, newCommentData]);
      setNewComment('');
    } catch (err) {
      console.error('❌ Error adding comment:', err);
      console.error('❌ Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      console.log('📝 Adding reply:', replyContent);
      const response = await api.post('/comments', {
        content: replyContent,
        article_id: articleId,
        parent_id: parentId
      });
      console.log('✅ Reply added:', response.data);
      
      // Add user data to the new reply
      const newReply = response.data.comment;
      newReply.user = {
        id: user.id,
        name: user.name
      };
      
      setComments([...comments, newReply]);
      setReplyContent('');
      setReplyTo(null);
    } catch (err) {
      console.error('❌ Error adding reply:', err);
      console.error('❌ Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId && c.parent_id !== commentId));
    } catch (err) {
      console.error('❌ Error deleting comment:', err);
      setError(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await api.post(`/comments/${commentId}/like`);
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            likes_count: response.data.liked ? (c.likes_count + 1) : (c.likes_count - 1),
            user_liked: response.data.liked
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('❌ Error liking comment:', err);
    }
  };

  const buildCommentTree = (comments) => {
    const commentMap = {};
    const roots = [];

    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      if (comment.parent_id) {
        if (commentMap[comment.parent_id]) {
          commentMap[comment.parent_id].replies.push(commentMap[comment.id]);
        }
      } else {
        roots.push(commentMap[comment.id]);
      }
    });

    return roots;
  };

  const commentTree = buildCommentTree(comments);

  // ============================================================
  // ⭐ RENDER COMMENT WITH FIXED AVATAR
  // ============================================================
  const renderComment = (comment, isReply = false) => {
    const isOwner = user.id === comment.user?.id;
    const avatarColor = getAvatarColor(comment.user?.name);
    const initials = getInitials(comment.user?.name);

    return (
      <div key={comment.id} className={`${isReply ? 'ms-4 mt-2' : 'mt-3'}`}>
        <Card className={`${isReply ? 'bg-light border-0' : 'shadow-sm border-0'}`}>
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div className="d-flex align-items-center">
                {/* ⭐ FIXED: Avatar with dynamic color and initials */}
                <div 
                  className="comment-avatar me-2"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'white',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  {initials}
                </div>
                <div>
                  <strong className="me-2">{comment.user?.name || 'Unknown'}</strong>
                  <span className="text-muted small">
                    {getTimeAgo(comment.created_at)}
                  </span>
                </div>
              </div>
              {isOwner && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-danger p-0"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              )}
            </div>
            <p className="mb-2 mt-1">{comment.content}</p>
            <div className="d-flex align-items-center gap-3">
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted text-decoration-none"
                onClick={() => handleLikeComment(comment.id)}
              >
                <i className={`bi ${comment.user_liked ? 'bi-heart-fill text-danger' : 'bi-heart'}`}></i>
                <span className="ms-1">{comment.likes_count || 0}</span>
              </Button>
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted text-decoration-none"
                onClick={() => setReplyTo(comment.id)}
              >
                <i className="bi bi-reply"></i>
                <span className="ms-1">Reply</span>
              </Button>
            </div>
          </Card.Body>
        </Card>

        {replyTo === comment.id && (
          <div className="mt-2 ms-4">
            <Form.Group className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder={`Reply to ${comment.user?.name || 'User'}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                size="sm"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAddReply(comment.id)}
                disabled={submitting || !replyContent.trim()}
              >
                Reply
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setReplyTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </Form.Group>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="ms-4">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" size="sm" />
        <span className="ms-2">Loading comments...</span>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h5 className="fw-bold">
        <i className="bi bi-chat-dots me-2"></i>
        Comments ({comments.length})
      </h5>

      {error && <Alert variant="danger" className="mt-2">{error}</Alert>}

      <Form onSubmit={handleAddComment} className="mt-3">
        <Form.Group className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            className="rounded-pill"
          />
          <Button
            type="submit"
            variant="primary"
            className="rounded-pill px-4"
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <i className="bi bi-send me-1"></i> Post
              </>
            )}
          </Button>
        </Form.Group>
      </Form>

      {commentTree.length === 0 ? (
        <div className="text-center text-muted py-4">
          <i className="bi bi-chat display-6 d-block mb-2"></i>
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="mt-3">
          {commentTree.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;