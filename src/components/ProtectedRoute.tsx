import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { isGuest, isLoading } = useAuth();

  if (isLoading) {
    // You can return a loading spinner here if you want
    return <div>Loading...</div>;
  }

  if (isGuest) {
    // Redirect guest users to the home page
    return <Navigate to="/test" replace />;
  }

  // If the user is authenticated and not a guest, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
