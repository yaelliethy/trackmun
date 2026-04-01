import { api } from './api';

export const uploadService = {
  getPaymentProofUrl: (data: { filename: string, contentType: string, size: number }) =>
    api.post<{ url: string, key: string }>('/upload/payment-proof-url', data),
  
  confirmPaymentProof: (data: { r2Key: string }) =>
    api.post<null>('/upload/confirm-payment-proof', data),
};
