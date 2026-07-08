import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  // If no token or user, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};

export default PrivateRoute;