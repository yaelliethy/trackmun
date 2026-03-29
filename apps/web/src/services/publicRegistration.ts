import { api } from './api';
import { RegistrationStep, RegistrationQuestion, Settings } from '@trackmun/shared';

export const publicRegistrationService = {
  getSettings: () => api.get<Settings>('/registration/settings'),
  listSteps: () => api.get<RegistrationStep[]>('/registration/steps'),
  listQuestions: () => api.get<RegistrationQuestion[]>('/registration/questions'),
  getPaymentProofUrl: (data: { filename: string, contentType: string, size: number }) =>
    api.post<{ uploadUrl: string, key: string }>('/registration/payment-proof-url', data),
};
