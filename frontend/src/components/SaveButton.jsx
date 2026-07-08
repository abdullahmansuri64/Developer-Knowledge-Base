import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import api from '../services/api';

const SaveButton = ({ articleId, isSaved: initialSaved, onToggle }) => {
  const [saved, setSaved] = useState(initialSaved || false);
  const [loading, setLoading] = useState(false);

  const toggleSave = async () => {
    setLoading(true);
    try {
      const response = await api.post('/saved-articles', { article_id: articleId });
      setSaved(response.data.saved);
      if (onToggle) onToggle();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save article. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={saved ? 'warning' : 'outline-warning'}
      size="sm"
      onClick={toggleSave}
      disabled={loading}
    >
      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : (
        <>
          <i className={`bi bi-bookmark${saved ? '-fill' : ''} me-1`}></i>
          {saved ? 'Saved' : 'Save'}
        </>
      )}
    </Button>
  );
};

export default SaveButton;