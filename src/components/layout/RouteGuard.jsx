import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, ROLES } from '@/lib/roles';

export default function RouteGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role || ROLES.USUARIO;

  // /admin only for admins
  if (location.pathname === '/admin' && role !== ROLES.ADMIN) {
    return <Navigate to="/" replace />;
  }

  // /perfil always accessible
  if (location.pathname === '/perfil') return children;

  if (!canAccess(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}