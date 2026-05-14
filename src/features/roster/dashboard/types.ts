// ─────────────────────────────────────────────
// DASHBOARD TYPES - Exam Command Center
// ─────────────────────────────────────────────

export interface DashboardOverviewSummary {
  totalClasses: number;
  totalStudents: number;
  totalDistinctCourses: number;
  totalDistinctRooms: number;
  totalDistinctShifts: number;
  classesWithExamToday: number;
  classesWithExamThisWeek: number;
}

export interface DashboardPhotoHealth {
  validPhotoRate: number;
  loadedCount: number;
  pendingCount: number;
  notFoundCount: number;
  classesWithIncompletePhoto: number;
}

export interface ExamTimelineItem {
  classId: string;
  courseCode: string;
  courseName: string;
  examDate: string;          // 'YYYY-MM-DD'
  examRoom: string | null;
  examTime: string | null;
  examShift: string | null;
  studentCount: number;
  validPhotoRate: number;
  presentCount: number | null;
  absentCount: number | null;
  attendanceRate: number | null;
}

export interface RoomStat {
  examRoom: string;
  classCount: number;
  studentCount: number;
}

export interface ShiftStat {
  examShift: string;
  examTime: string | null;
  classCount: number;
  studentCount: number;
}

export interface CourseStat {
  courseCode: string;
  courseName: string;
  classCount: number;
  studentCount: number;
}

export interface DashboardLogistics {
  byRoom: RoomStat[];
  byShift: ShiftStat[];
  byCourse: CourseStat[];
}

export interface DashboardAttendance {
  classesWithAttendance: number;
  classesWithoutAttendance: number;
  totalStudents: number;
  totalNotMarked: number;
  totalPresent: number;
  totalAbsent: number;
  globalPresentRate: number | null;
}

export interface DashboardShareLinks {
  totalLinks: number;
  activeCount: number;
  publicActiveCount: number;
  privateActiveCount: number;
  expiringSoon24hCount: number;
  expiredCount: number;
  inactiveCount: number;
  expiredOrInactiveCount: number;
}

export interface ExamCommandCenterResponse {
  overview: DashboardOverviewSummary;
  photoHealth: DashboardPhotoHealth;
  allExams: ExamTimelineItem[];
  logistics: DashboardLogistics;
  attendance: DashboardAttendance;
  shareLinks: DashboardShareLinks;
  generatedAt: string;
}
