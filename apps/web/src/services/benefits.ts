import { api } from './api';
import { Benefit } from '@trackmun/shared';

export const benefitsService = {
  list: () => 
    api.get<Benefit[]>(`/admin/benefits`),
  
  create: (data: { name: string }) =>
    api.post<Benefit>(`/admin/benefits`, data),

  delete: (id: string) =>
    api.delete<null>(`/admin/benefits/${id}`),
};
