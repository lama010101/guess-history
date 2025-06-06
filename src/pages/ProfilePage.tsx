import ProfileLayout1 from "@/components/layouts/ProfileLayout1";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user } = useAuth();
  // If no user is found (not even a guest), redirect to auth page
  if (!user) {
    return <Navigate to="/test/auth" />;
  }
  // Both authenticated users and guests can view the profile
  return <ProfileLayout1 />;
};

export default ProfilePage;