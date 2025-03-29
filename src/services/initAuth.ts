
import { useAuth } from "./auth";
import { mockUsers } from "./mockUsers";
import { initializeAuthWithSupabase } from "./auth";

export const initializeAuth = async () => {
  // First try to initialize with Supabase
  await initializeAuthWithSupabase();
  
  // If users array is still empty, fall back to mock data
  const { users } = useAuth.getState();
  
  if (!users || users.length === 0) {
    useAuth.setState({ users: mockUsers });
    // Also try to sync users from Supabase
    await useAuth.getState().syncUsersFromSupabase();
  }
};
