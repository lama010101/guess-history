
import { User } from "./auth";

// Sample users for development and testing
export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'admin',
    email: 'admin@example.com',
    isGuest: false,
    isAI: false,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  },
  {
    id: 'user-2',
    username: 'johndoe',
    email: 'john@example.com',
    isGuest: false,
    isAI: false,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe'
  },
  {
    id: 'user-3',
    username: 'janedoe',
    email: 'jane@example.com',
    isGuest: false,
    isAI: false,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=janedoe'
  },
  {
    id: 'ai-1',
    username: 'AI User 1',
    email: 'ai1@example.com',
    isGuest: false,
    isAI: true,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ai1'
  },
  {
    id: 'ai-2',
    username: 'AI User 2',
    email: 'ai2@example.com',
    isGuest: false,
    isAI: true,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ai2'
  }
];

// Initialize auth store with mock users
export const initMockUsers = (setUsers: (users: User[]) => void) => {
  setUsers(mockUsers);
};
