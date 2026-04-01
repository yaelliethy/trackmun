import { api } from './api';
import { User, RegisterUser } from '@trackmun/shared';
import { supabase } from '../lib/supabase';

export interface RegisterResponse {
  user: User;
}

export const authService = {
  register: (data: RegisterUser) =>
    api.post<RegisterResponse>('/auth/register', data),

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // After signing in with Supabase, we fetch the user profile from our Worker
    // to ensure we have the latest Turso data (role, council, etc.)
    const user = await api.get<User>('/auth/me');
    
    return {
      session: data.session,
      user,
    };
  },

  signOut: async () => {
    localStorage.removeItem("impersonation_token");
    localStorage.removeItem("impersonated_user");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return null;
  },

  getCurrentUser: () =>
    api.get<User>('/auth/me'),
};
