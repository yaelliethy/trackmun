import { api } from './api';
import type { Council } from '@trackmun/shared';

export const councilsService = {
  list: () => api.get<Council[]>('/admin/councils'),
  create: (name: string, shortName: string) => 
    api.post<Council>('/admin/councils', { name, shortName }),
  update: (id: string, name: string, shortName: string) =>
    api.put<Council>(`/admin/councils/${id}`, { name, shortName }),
  delete: (id: string) => api.delete<null>(`/admin/councils/${id}`),
};
