import React, { useState, useEffect, useRef } from 'react';
import { Dropdown, Badge, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      console.log('📡 Notifications:', response.data);
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ⭐ FIXED: getTimeAgo with proper time calculation
  // ============================================================
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    
    try {
      const pastDate = new Date(dateString);
      
      if (isNaN(pastDate.getTime())) {
        return 'Just now';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - pastDate.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      // If negative or less than 5 seconds, show 'Just now'
      if (diffSec < 5) {
        return 'Just now';
      }
      
      // Less than a minute
      if (diffSec < 60) {
        return `${diffSec}s ago`;
      }
      
      // Minutes
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        return `${diffMin}m ago`;
      }
      
      // Hours
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) {
        return `${diffHour}h ago`;
      }
      
      // Days
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) {
        return `${diffDay}d ago`;
      }
      
      // Weeks
      const diffWeek = Math.floor(diffDay / 7);
      if (diffWeek < 4) {
        return `${diffWeek}w ago`;
      }
      
      // For older dates, show actual date
      return pastDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error parsing date:', error);
      return 'Just now';
    }
  };

  const handleToggle = (isOpen) => {
    setIsOpen(isOpen);
    if (isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <i className="bi bi-heart-fill text-danger"></i>;
      case 'comment':
        return <i className="bi bi-chat-fill text-primary"></i>;
      case 'reply':
        return <i className="bi bi-reply-fill text-success"></i>;
      case 'follow':
        return <i className="bi bi-person-plus-fill text-info"></i>;
      case 'new_article':
        return <i className="bi bi-file-earmark-text-fill text-warning"></i>;
      default:
        return <i className="bi bi-bell-fill text-secondary"></i>;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case 'like':
        return 'rgba(239, 68, 68, 0.08)';
      case 'comment':
        return 'rgba(59, 130, 246, 0.08)';
      case 'reply':
        return 'rgba(16, 185, 129, 0.08)';
      case 'follow':
        return 'rgba(14, 165, 233, 0.08)';
      case 'new_article':
        return 'rgba(245, 158, 11, 0.08)';
      default:
        return 'rgba(107, 114, 128, 0.08)';
    }
  };

  return (
    <div className="notification-bell-wrapper">
      <Dropdown
        align="end"
        onToggle={handleToggle}
        ref={dropdownRef}
      >
        <Dropdown.Toggle variant="link" className="bell-toggle p-0">
          <div className="bell-icon">
            <i className="bi bi-bell fs-5"></i>
            {unreadCount > 0 && (
              <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </Dropdown.Toggle>

        <Dropdown.Menu className="notification-dropdown">
          <div className="notification-header">
            <div className="d-flex align-items-center gap-2">
              <h6 className="notification-title mb-0">Notifications</h6>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <i className="bi bi-bell-slash"></i>
                <p className="mb-0">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.is_read) {
                      handleMarkRead(notif.id);
                    }
                    if (notif.link) {
                      navigate(notif.link);
                    }
                  }}
                >
                  <div 
                    className="notification-icon"
                    style={{ background: getNotificationBg(notif.type) }}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notif.message}</p>
                    <div className="notification-meta">
                      <span className="notification-time">
                        <i className="bi bi-clock me-1"></i>
                        {getTimeAgo(notif.created_at)}
                      </span>
                      {!notif.is_read && <span className="notification-dot"></span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-footer">
            <Link to="/notifications" className="view-all-link">
              View all notifications <i className="bi bi-arrow-right"></i>
            </Link>
          </div>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default NotificationBell;