
import { useAuth } from "./auth";
import { mockUsers } from "./mockUsers";

export const initializeAuth = () => {
  const { users } = useAuth.getState();
  
  // Only initialize if users array is empty
  if (!users || users.length === 0) {
    useAuth.setState({ users: mockUsers });
  }
};
