import { api } from './api';
import { RegistrationStep, RegistrationQuestion, Settings, DelegateResponse } from '@trackmun/shared';

export const adminRegistrationService = {
  getSettings: () => api.get<Settings>('/admin/registration/settings'),
  updateSettings: (data: Settings) => api.put<Settings>('/admin/registration/settings', data),

  listSteps: () => api.get<RegistrationStep[]>('/admin/registration/steps'),
  createStep: (data: Omit<RegistrationStep, 'id'>) => api.post<RegistrationStep>('/admin/registration/steps', data),
  updateStep: (id: string, data: Partial<RegistrationStep>) => api.put<null>(`/admin/registration/steps/${id}`, data),
  deleteStep: (id: string) => api.delete<null>(`/admin/registration/steps/${id}`),

  listQuestions: () => api.get<RegistrationQuestion[]>('/admin/registration/questions'),
  createQuestion: (data: Omit<RegistrationQuestion, 'id'>) => api.post<RegistrationQuestion>('/admin/registration/questions', data),
  updateQuestion: (id: string, data: Partial<RegistrationQuestion>) => api.put<null>(`/admin/registration/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete<null>(`/admin/registration/questions/${id}`),

  getResponses: () => api.get<DelegateResponse[]>('/admin/registration/responses'),
  getResponse: (userId: string) => api.get<DelegateResponse>(`/admin/registration/responses/${userId}`),
};
