import { api } from './api';
import { User } from '@trackmun/shared';

export interface UserListResponse {
  users: User[];
  total: number;
}

export const delegatesService = {
  list: (page = 1, limit = 20, filters?: any) => {
    let url = `/admin/delegates?page=${page}&limit=${limit}`;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url += `&${key}=${encodeURIComponent(String(value))}`;
        }
      });
    }
    return api.get<UserListResponse>(url);
  },
  
  update: (id: string, data: { name?: string; council?: string | null }) =>
    api.patch<User>(`/admin/delegates/${id}`, data),
  
  delete: (id: string) =>
    api.delete<null>(`/admin/delegates/${id}`),

  updatePaymentStatus: (id: string, data: { depositPaymentStatus?: 'pending' | 'paid'; fullPaymentStatus?: 'pending' | 'paid' }) =>
    api.patch<null>(`/admin/delegates/${id}/payments`, data),
};
