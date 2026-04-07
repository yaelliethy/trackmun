import { api } from './api';
import type { Council } from '@trackmun/shared';

export const councilsService = {
  list: () => api.get<Council[]>('/admin/councils'),
  create: (name: string, shortName: string, capacity?: number | null, isPress?: boolean) =>
    api.post<Council>('/admin/councils', { name, shortName, capacity, isPress }),
  update: (id: string, name: string, shortName: string, capacity?: number | null, isPress?: boolean) =>
    api.put<Council>(`/admin/councils/${id}`, { name, shortName, capacity, isPress }),
  delete: (id: string) => api.delete<null>(`/admin/councils/${id}`),
};
