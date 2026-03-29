import { api } from './api';
import {
  User,
  ActiveAttendancePeriod,
  DelegateSearchResult,
  BenefitWithStatus,
  AttendanceResult,
  BenefitRedeemResult,
} from '@trackmun/shared';

export interface UserListResponse {
  users: User[];
  total: number;
}

export const ocService = {
  // Admin methods
  list: (page = 1, limit = 20, filters?: any) => {
    let url = `/admin/oc?page=${page}&limit=${limit}`;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url += `&${key}=${encodeURIComponent(String(value))}`;
        }
      });
    }
    return api.get<UserListResponse>(url);
  },
  
  create: (data: any) =>
    api.post<User>(`/admin/oc`, data),

  update: (id: string, data: { name?: string; council?: string | null }) =>
    api.patch<User>(`/admin/oc/${id}`, data),
  
  delete: (id: string) =>
    api.delete<null>(`/admin/oc/${id}`),

  impersonate: (id: string) =>
    api.post<{ token: string }>(`/auth/admin/impersonate/${id}`),

  // OC Dashboard methods
  getActivePeriod: () =>
    api.get<ActiveAttendancePeriod | null>('/oc/attendance/active'),

  recordAttendance: (data: { delegateId: string; periodId: string; sessionLabel: string }) =>
    api.post<AttendanceResult>('/oc/attendance/record', data),

  listBenefits: () =>
    api.get<{ id: string; name: string }[]>('/oc/benefits'),

  getBenefitStatus: (delegateId: string) =>
    api.get<BenefitWithStatus[]>(`/oc/benefits/status/${delegateId}`),

  redeemBenefit: (data: { delegateId: string; benefitId: string }) =>
    api.post<BenefitRedeemResult>('/oc/benefits/redeem', data),

  searchDelegates: (q: string) =>
    api.get<DelegateSearchResult[]>(`/oc/delegates/search?q=${encodeURIComponent(q)}`),
};
