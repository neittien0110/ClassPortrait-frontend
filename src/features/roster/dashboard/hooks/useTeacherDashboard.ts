import { useCallback, useEffect, useState } from 'react';
import dashboardApi from '../services/dashboard.api';
import {
  ExamCommandCenterResponse,
  DashboardOverviewSummary,
  DashboardPhotoHealth,
  DashboardLogistics,
  DashboardAttendance,
  DashboardShareLinks,
  ExamTimelineItem,
} from '../types';

// ─────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────

const defaultOverview: DashboardOverviewSummary = {
  totalClasses: 0,
  totalStudents: 0,
  totalDistinctCourses: 0,
  totalDistinctRooms: 0,
  totalDistinctShifts: 0,
  classesWithExamToday: 0,
  classesWithExamThisWeek: 0,
};

const defaultPhotoHealth: DashboardPhotoHealth = {
  validPhotoRate: 0,
  loadedCount: 0,
  pendingCount: 0,
  notFoundCount: 0,
  classesWithIncompletePhoto: 0,
};

const defaultLogistics: DashboardLogistics = {
  byRoom: [],
  byShift: [],
  byCourse: [],
};

interface DashboardFilters {
  startDate: string;
  endDate: string;
}

const defaultAttendance: DashboardAttendance = {
  classesWithAttendance: 0,
  classesWithoutAttendance: 0,
  totalStudents: 0,
  totalNotMarked: 0,
  totalPresent: 0,
  totalAbsent: 0,
  globalPresentRate: null,
};

const defaultShareLinks: DashboardShareLinks = {
  totalLinks: 0,
  activeCount: 0,
  publicActiveCount: 0,
  privateActiveCount: 0,
  expiringSoon24hCount: 0,
  expiredCount: 0,
  inactiveCount: 0,
  expiredOrInactiveCount: 0,
};

// ─────────────────────────────────────────────
// RETURN TYPE
// ─────────────────────────────────────────────

interface UseTeacherDashboardReturn {
  overview: DashboardOverviewSummary;
  photoHealth: DashboardPhotoHealth;
  allExams: ExamTimelineItem[];
  logistics: DashboardLogistics;
  attendance: DashboardAttendance;
  shareLinks: DashboardShareLinks;
  generatedAt: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  availableDates: string[];
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
}

// ─────────────────────────────────────────────
// ERROR MAP
// ─────────────────────────────────────────────

const mapDashboardError = (error: any): string => {
  const status = error?.response?.status;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền truy cập dashboard này.';
  if (status === 404) return 'Không tìm thấy endpoint dashboard. Vui lòng kiểm tra backend.';
  return 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.';
};

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

/**
 * Quản lý toàn bộ state và gọi API cho Exam Command Center Dashboard.
 * @returns Trạng thái dữ liệu dashboard, action refetch và state quản lý bộ lọc.
 */
export const useTeacherDashboard = (): UseTeacherDashboardReturn => {
  const [data, setData] = useState<ExamCommandCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  /**
   * Tải dữ liệu Exam Command Center từ API.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await dashboardApi.getExamCommandCenter({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        expiringSoonDays: 3,
      });
      setData(payload);
    } catch (fetchError: any) {
      setError(mapDashboardError(fetchError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allExams = data?.allExams ?? [];
  const availableDates = Array.from(new Set(allExams.map(e => e.examDate))).sort();

  return {
    overview: data?.overview ?? defaultOverview,
    photoHealth: data?.photoHealth ?? defaultPhotoHealth,
    allExams,
    logistics: data?.logistics ?? defaultLogistics,
    attendance: data?.attendance ?? defaultAttendance,
    shareLinks: data?.shareLinks ?? defaultShareLinks,
    generatedAt: data?.generatedAt ?? '',
    loading,
    error,
    refetch: fetchData,
    selectedDate,
    setSelectedDate,
    availableDates,
    filters,
    setFilters,
  };
};

export default useTeacherDashboard;
