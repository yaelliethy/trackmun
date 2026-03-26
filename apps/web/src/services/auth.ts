import { api } from './api';
import { User, RegisterUser } from '@trackmun/shared';

export interface RegisterResponse {
  user: User;
}

export const authService = {
  register: (data: RegisterUser) =>
    api.post<RegisterResponse>('/auth/register', data),

  signIn: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/sign-in/email', { email, password }),

  signOut: () =>
    api.post<null>('/auth/sign-out'),

  getToken: () =>
    api.get<{ token: string }>('/auth/token'),

  getCurrentUser: () =>
    api.get<User>('/auth/me'),
};
