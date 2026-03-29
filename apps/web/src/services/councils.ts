import { api } from './api';
import type { Council } from '@trackmun/shared';

export const councilsService = {
  list: () => api.get<Council[]>('/admin/councils'),
  create: (name: string) => api.post<Council>('/admin/councils', { name }),
  update: (id: string, name: string) =>
    api.put<Council>(`/admin/councils/${id}`, { name }),
  delete: (id: string) => api.delete<null>(`/admin/councils/${id}`),
};
