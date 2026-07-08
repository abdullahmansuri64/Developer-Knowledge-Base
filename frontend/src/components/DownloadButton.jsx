import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';

const DownloadButton = ({ articleId, title }) => {
  const [loading, setLoading] = useState(false);

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/articles/${articleId}/download/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline-danger" 
      size="sm"
      onClick={downloadPDF}
      disabled={loading}
    >
      {loading ? (
        <>
          <Spinner animation="border" size="sm" className="me-1" />
          Downloading...
        </>
      ) : (
        <>
          <i className="bi bi-file-pdf me-1"></i> Download PDF
        </>
      )}
    </Button>
  );
};

export default DownloadButton;