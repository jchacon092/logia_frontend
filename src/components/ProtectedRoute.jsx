import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requirePerm }) {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace/>;
  if (requirePerm && !hasPermission(requirePerm)) return <Navigate to="/403" replace/>;
  return children;
}
