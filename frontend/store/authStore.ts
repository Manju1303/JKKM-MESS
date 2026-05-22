import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleId: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    setAuth: (user, token) => {
      localStorage.setItem('jkkm_token', token);
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('jkkm_token');
      localStorage.removeItem('jkkm_user');
      set({ user: null, token: null, isAuthenticated: false });
    },
    hasRole: (roles) => {
      const user = get().user;
      if (!user) return false;
      return roles.includes(user.role);
    },
  }),
  { name: 'jkkm_auth' }
));
