import { create } from 'zustand';
import { User } from '@trackmun/shared';

interface AuthState {
  user: User | null;
  isImpersonating: boolean;
  impersonatedUser: User | null;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  startImpersonation: (token: string, user: User) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isImpersonating: !!localStorage.getItem('impersonation_token'),
  impersonatedUser: localStorage.getItem('impersonated_user') 
    ? JSON.parse(localStorage.getItem('impersonated_user')!) 
    : null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  
  startImpersonation: (token, user) => {
    localStorage.setItem('impersonation_token', token);
    localStorage.setItem('impersonated_user', JSON.stringify(user));
    set({ isImpersonating: true, impersonatedUser: user });
  },
  
  stopImpersonation: () => {
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonated_user');
    set({ isImpersonating: false, impersonatedUser: null });
  },
}));
