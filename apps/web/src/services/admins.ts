import { api } from './api';
import { User } from '@trackmun/shared';

export const adminsService = {
  list: (page: number = 1, limit: number = 20, filters?: any) => {
    let url = `/admin/admins?page=${page}&limit=${limit}`;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url += `&${key}=${encodeURIComponent(String(value))}`;
        }
      });
    }
    return api.get<{ users: User[], total: number }>(url);
  },
  
  update: (id: string, data: { name?: string, council?: string | null, role?: string }) =>
    api.patch<User>(`/admin/admins/${id}`, data),

  delete: (id: string) =>
    api.delete<null>(`/admin/admins/${id}`),

  create: (data: any) =>
    api.post<User>(`/admin/admins`, data),
};
