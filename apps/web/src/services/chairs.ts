import { api } from './api';
import { User } from '@trackmun/shared';

export interface UserListResponse {
  users: User[];
  total: number;
}

export const chairsService = {
  list: (page = 1, limit = 20) => 
    api.get<UserListResponse>(`/admin/chairs?page=${page}&limit=${limit}`),
  
  update: (id: string, data: { name?: string; council?: string | null }) =>
    api.patch<User>(`/admin/chairs/${id}`, data),
  
  delete: (id: string) =>
    api.delete<null>(`/admin/chairs/${id}`),

  impersonate: (id: string) =>
    api.post<{ token: string }>(`/auth/admin/impersonate/${id}`),
};
