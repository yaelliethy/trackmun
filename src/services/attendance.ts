import { api } from './api';
import { ConferenceDay, AttendancePeriod } from '@trackmun/shared';

export const attendanceService = {
  listDays: () => 
    api.get<ConferenceDay[]>(`/admin/attendance`),
  
  createDay: (data: { name: string, date: string }) =>
    api.post<ConferenceDay>(`/admin/attendance`, data),

  deleteDay: (id: string) =>
    api.delete<null>(`/admin/attendance/${id}`),

  replacePeriods: (dayId: string, periods: { startTime: string, endTime: string }[]) =>
    api.put<AttendancePeriod[]>(`/admin/attendance/${dayId}/periods`, { periods }),
};
