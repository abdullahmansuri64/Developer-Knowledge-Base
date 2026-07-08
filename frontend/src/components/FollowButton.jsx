import React, { useState, useEffect } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import api from '../services/api';

const FollowButton = ({ userId, onFollowChange }) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (userId && userId !== currentUser.id) {
      checkFollowStatus();
    } else {
      setChecking(false);
    }
  }, [userId]);

  const checkFollowStatus = async () => {
    try {
      console.log('Checking follow status for user:', userId);
      const response = await api.get(`/follow/check/${userId}`);
      console.log('Follow status response:', response.data);
      setFollowing(response.data.following);
    } catch (err) {
      console.error('Error checking follow status:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleFollow = async () => {
    setLoading(true);
    try {
      console.log('Following/unfollowing user:', userId);
      const response = await api.post(`/follow/${userId}`);
      console.log('Follow response:', response.data);
      setFollowing(response.data.following);
      if (onFollowChange) onFollowChange(response.data.following);
    } catch (err) {
      console.error('Error following user:', err);
      alert(err.response?.data?.error || 'Failed to follow user');
    } finally {
      setLoading(false);
    }
  };

  // Don't show follow button for own profile
  if (userId === currentUser.id || !userId) {
    return null;
  }

  if (checking) {
    return (
      <Button variant="outline-secondary" size="sm" disabled>
        <Spinner animation="border" size="sm" />
      </Button>
    );
  }

  return (
    <Button
      variant={following ? 'outline-secondary' : 'primary'}
      size="sm"
      onClick={handleFollow}
      disabled={loading}
      className="rounded-pill px-3"
    >
      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : following ? (
        <>
          <i className="bi bi-check-circle me-1"></i> Following
        </>
      ) : (
        <>
          <i className="bi bi-person-plus me-1"></i> Follow
        </>
      )}
    </Button>
  );
};

export default FollowButton;