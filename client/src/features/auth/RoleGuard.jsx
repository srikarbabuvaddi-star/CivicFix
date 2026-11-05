import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardPathForRole } from '../../utils/constants.js';

export function RoleGuard({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the user's authorized role dashboard
    const redirectPath = getDashboardPathForRole(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

