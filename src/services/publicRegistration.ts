import { api } from './api';

export const publicRegistrationService = {
  getSettings: () => api.get<any>('/public/registration/settings'),
  listSteps: () => api.get<any[]>('/public/registration/steps'),
  listQuestions: () => api.get<any[]>('/public/registration/questions'),
  getFullCouncils: () => api.get<string[]>('/public/registration/councils/full'),
  getPaymentProofUrl: (data: any) => api.post<any>('/public/registration/payment-proof', data),
  getCountries: () => api.get<any[]>('/public/registration/countries'),
};
