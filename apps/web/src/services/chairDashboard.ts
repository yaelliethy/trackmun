import { api } from './api';

export const chairDashboardService = {
  getSettings: () => api.get<Record<string, unknown>>('/chairs/settings'),
  getRequests: () => api.get<any[]>('/chairs/requests'),
  acceptDelegate: (userId: string) => api.post(`/chairs/requests/${userId}/accept`),
  deferDelegate: (userId: string) => api.post(`/chairs/requests/${userId}/defer`),
  rejectDelegate: (userId: string) => api.post(`/chairs/requests/${userId}/reject`),
  getAssignedDelegates: (filters?: { search?: string; country?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.country) params.append('country', filters.country);
    return api.get<any[]>(`/chairs/delegates?${params.toString()}`);
  },
  assignCountry: (userId: string, country: string) => api.put(`/chairs/delegates/${userId}/country`, { country }),
  addAward: (userId: string, awardType: string, notes: string | null) => api.post(`/chairs/delegates/${userId}/awards`, { awardType, notes }),
  removeAward: (userId: string) => api.delete(`/chairs/delegates/${userId}/awards`),
  removeDelegate: (userId: string) => api.delete(`/chairs/delegates/${userId}`),
  getActivePeriod: () => api.get<any>('/chairs/attendance/active'),
  recordAttendance: (data: { delegateId: string; periodId: string; sessionLabel: string }) => api.post<any>('/chairs/attendance/record', data),
  searchDelegates: (query: string) => api.get<any[]>(`/chairs/delegates/search?q=${encodeURIComponent(query)}`),
  getResponse: (userId: string) => api.get<any>(`/chairs/delegates/${userId}/responses`)
};
