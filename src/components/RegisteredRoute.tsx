import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const RegisteredRoute = () => {
  const { isLoading, isGuest, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (isGuest) {
    return (
      <Navigate
        to="/home"
        replace
        state={{ requireRegistration: true, from: location.pathname }}
      />
    );
  }

  return <Outlet />;
};

export default RegisteredRoute;
