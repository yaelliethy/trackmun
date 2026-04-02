import { api } from './api';
import type { Council } from '@trackmun/shared';

export const councilsService = {
  list: () => api.get<Council[]>('/admin/councils'),
  create: (name: string, shortName: string, capacity?: number | null) => 
    api.post<Council>('/admin/councils', { name, shortName, capacity }),
  update: (id: string, name: string, shortName: string, capacity?: number | null) =>
    api.put<Council>(`/admin/councils/${id}`, { name, shortName, capacity }),
  delete: (id: string) => api.delete<null>(`/admin/councils/${id}`),
};
