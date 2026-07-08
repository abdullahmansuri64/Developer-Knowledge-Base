// import React, { useState, useEffect } from 'react';
// import { Container, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
// import { Link } from 'react-router-dom';
// import api from '../services/api';

// const NotificationsPage = () => {
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [markingAll, setMarkingAll] = useState(false);

//   useEffect(() => {
//     fetchNotifications();
//   }, []);

//   const fetchNotifications = async () => {
//     try {
//       setLoading(true);
//       setError('');
//       const response = await api.get('/notifications');
//       setNotifications(response.data.notifications || []);
//     } catch (err) {
//       console.error('Error fetching notifications:', err);
//       if (err.response?.status === 401) {
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         window.location.href = '/login';
//         return;
//       }
//       setError('Failed to load notifications');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const markAllAsRead = async () => {
//     setMarkingAll(true);
//     try {
//       await api.put('/notifications/read-all');
//       setNotifications(notifications.map(n => ({ ...n, is_read: true })));
//     } catch (err) {
//       console.error('Error marking all as read:', err);
//       alert('Failed to mark notifications as read');
//     } finally {
//       setMarkingAll(false);
//     }
//   };

//   const markSingleAsRead = async (notificationId) => {
//     try {
//       await api.put(`/notifications/${notificationId}/read`);
//       setNotifications(notifications.map(n =>
//         n.id === notificationId ? { ...n, is_read: true } : n
//       ));
//     } catch (err) {
//       console.error('Error marking notification as read:', err);
//     }
//   };

//   const getNotificationIcon = (type) => {
//     const icons = {
//       'comment': <i className="bi bi-chat text-primary"></i>,
//       'reply': <i className="bi bi-reply text-success"></i>,
//       'like': <i className="bi bi-heart-fill text-danger"></i>,
//       'new_article': <i className="bi bi-file-earmark-text text-info"></i>,
//       'follow': <i className="bi bi-person-plus text-warning"></i>
//     };
//     return icons[type] || <i className="bi bi-bell text-secondary"></i>;
//   };

//   // ============================================================
//   // ⭐ COMPLETELY FIXED: getTimeAgo with correct calculation
//   // ============================================================
//   const getTimeAgo = (dateString) => {
//     if (!dateString) return 'Just now';
    
//     try {
//       // Parse the date
//       const pastDate = new Date(dateString);
      
//       // Check if date is valid
//       if (isNaN(pastDate.getTime())) {
//         console.warn('Invalid date:', dateString);
//         return 'Just now';
//       }
      
//       const now = new Date();
//       const diffInSeconds = Math.floor((now.getTime() - pastDate.getTime()) / 1000);
      
//       // If date is in the future or invalid, return 'Just now'
//       if (diffInSeconds < 0) {
//         return 'Just now';
//       }
      
//       // Less than 60 seconds
//       if (diffInSeconds < 60) {
//         return 'Just now';
//       }
      
//       // Minutes
//       const minutes = Math.floor(diffInSeconds / 60);
//       if (minutes < 60) {
//         return `${minutes}m ago`;
//       }
      
//       // Hours
//       const hours = Math.floor(minutes / 60);
//       if (hours < 24) {
//         return `${hours}h ago`;
//       }
      
//       // Days
//       const days = Math.floor(hours / 24);
//       if (days < 7) {
//         return `${days}d ago`;
//       }
      
//       // Weeks
//       const weeks = Math.floor(days / 7);
//       if (weeks < 4) {
//         return `${weeks}w ago`;
//       }
      
//       // For older dates, show formatted date
//       return pastDate.toLocaleDateString('en-US', {
//         month: 'short',
//         day: 'numeric',
//         year: 'numeric'
//       });
//     } catch (error) {
//       console.error('Error in getTimeAgo:', error);
//       return 'Just now';
//     }
//   };

//   const unreadCount = notifications.filter(n => !n.is_read).length;

//   if (loading) {
//     return (
//       <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
//         <Spinner animation="border" variant="primary" />
//       </Container>
//     );
//   }

//   return (
//     <Container className="py-4" style={{ maxWidth: '900px' }}>
//       <div className="d-flex justify-content-between align-items-center mb-4">
//         <div>
//           <h3 className="fw-bold">
//             <i className="bi bi-bell me-2 text-primary"></i>
//             Notifications
//           </h3>
//           <p className="text-muted mb-0">Stay updated with your activity</p>
//         </div>
//         {unreadCount > 0 && (
//           <Button
//             variant="outline-primary"
//             size="sm"
//             onClick={markAllAsRead}
//             disabled={markingAll}
//             className="rounded-pill px-4"
//           >
//             {markingAll ? (
//               <Spinner animation="border" size="sm" />
//             ) : (
//               <>
//                 <i className="bi bi-check-all me-1"></i>
//                 Mark all read ({unreadCount})
//               </>
//             )}
//           </Button>
//         )}
//       </div>

//       {error && (
//         <Alert variant="danger">
//           <i className="bi bi-exclamation-triangle me-2"></i>
//           {error}
//           <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchNotifications}>
//             Retry
//           </Button>
//         </Alert>
//       )}

//       {notifications.length === 0 && !error ? (
//         <Card className="shadow-sm border-0 text-center py-5">
//           <Card.Body>
//             <div className="empty-state-icon mb-3">
//               <i className="bi bi-bell-slash display-1 text-muted"></i>
//             </div>
//             <h5 className="text-muted">No notifications</h5>
//             <p className="text-muted">You're all caught up!</p>
//             <Button as={Link} to="/articles" variant="primary" className="rounded-pill px-4">
//               <i className="bi bi-collection me-2"></i> Browse Articles
//             </Button>
//           </Card.Body>
//         </Card>
//       ) : (
//         <div className="notification-list-page">
//           <div className="notification-stats mb-3">
//             <span className="text-muted">
//               {unreadCount > 0 ? (
//                 <>You have <strong className="text-primary">{unreadCount}</strong> unread notification{unreadCount > 1 ? 's' : ''}</>
//               ) : (
//                 <>All caught up! <i className="bi bi-check-circle text-success"></i></>
//               )}
//             </span>
//           </div>

//           {notifications.map((notification) => (
//             <Card
//               key={notification.id}
//               className={`notification-card mb-3 ${!notification.is_read ? 'unread' : ''}`}
//               onClick={() => {
//                 if (!notification.is_read) {
//                   markSingleAsRead(notification.id);
//                 }
//                 if (notification.link) {
//                   window.location.href = notification.link;
//                 }
//               }}
//             >
//               <Card.Body className="d-flex align-items-start">
//                 <div className="notification-card-icon">
//                   {getNotificationIcon(notification.type)}
//                 </div>
//                 <div className="notification-card-content flex-grow-1">
//                   <p className="notification-card-message mb-1">
//                     {notification.message}
//                   </p>
//                   <div className="d-flex justify-content-between align-items-center">
//                     <span className="notification-card-time">
//                       <i className="bi bi-clock me-1"></i>
//                       {getTimeAgo(notification.created_at)}
//                     </span>
//                     {!notification.is_read && (
//                       <Badge bg="primary" pill className="notification-unread-badge">
//                         New
//                       </Badge>
//                     )}
//                   </div>
//                 </div>
//                 {!notification.is_read && (
//                   <div className="notification-card-dot">
//                     <span className="dot"></span>
//                   </div>
//                 )}
//               </Card.Body>
//             </Card>
//           ))}
//         </div>
//       )}
//     </Container>
//   );
// };

// export default NotificationsPage;