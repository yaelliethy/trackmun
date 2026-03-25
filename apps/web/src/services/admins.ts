import { api } from './api';
import { User } from '@trackmun/shared';

export const adminsService = {
  list: (page: number = 1, limit: number = 20) => 
    api.get<{ users: User[], total: number }>(`/admin/admins?page=${page}&limit=${limit}`),
  
  update: (id: string, data: { name?: string, council?: string | null, role?: string }) =>
    api.patch<User>(`/admin/admins/${id}`, data),

  delete: (id: string) =>
    api.delete<null>(`/admin/admins/${id}`),

  create: (data: any) =>
    api.post<User>(`/admin/admins`, data),
};
