import api from '../../../../lib/api';
import { ExamCommandCenterResponse } from '../types';

export interface GetExamCommandCenterParams {
  startDate?: string;
  endDate?: string;
  expiringSoonDays?: number;
}

/**
 * Gọi API lấy dữ liệu Exam Command Center cho giảng viên.
 * @param params Tham số tùy chọn: bộ lọc học kỳ và khoảng ngày.
 * @returns Snapshot dashboard tổng hợp.
 */
const getExamCommandCenter = async (
  params?: GetExamCommandCenterParams,
): Promise<ExamCommandCenterResponse> => {
  const response = await api.get<ExamCommandCenterResponse>('/classes/dashboard/overview', {
    params,
  });
  return response.data;
};


export const dashboardApi = {
  getExamCommandCenter,
};

export default dashboardApi;
