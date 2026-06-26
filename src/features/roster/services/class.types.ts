export type ImportSourceType = 'excel' | 'google_sheet';

export interface ImportHistoryClassFieldChange {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

export interface ImportHistoryStudentChanges {
  added?: number;
  removed?: number;
  renamed?: number;
  updated?: number;
  unchanged?: number;
  [key: string]: number | undefined;
}

export interface ImportHistoryChangesSummary {
  classFieldChanges?: ImportHistoryClassFieldChange[];
  studentChanges?: ImportHistoryStudentChanges;
}

export interface ImportHistoryClassSummary {
  id: string;
  semester: string;
  courseCode: string;
  courseName: string;
  department?: string;
  instructor?: string;
  classExamCode?: string;
  examDate?: string;
  examRoom?: string;
  examTime?: string;
  examShift?: string;
  importOrder: number;
}

export interface ImportHistoryItem {
  id: string;
  classId: string;
  action?: 'created' | 'updated' | string;
  duplicateDetected?: boolean;
  changesSummary?: ImportHistoryChangesSummary;
  classCode: string;
  courseCode?: string;
  courseName?: string;
  semester?: string;
  sourceType: ImportSourceType;
  sourceName: string;
  totalCount: number;
  importedRows: number;
  skippedRows: number;
  mappingModeUsed?: 'auto' | 'manual' | string | null;
  classIds?: string[];
  classes?: ImportHistoryClassSummary[];
  createdAt: string;
}

export interface ImportHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ImportHistoryResponse {
  items: ImportHistoryItem[];
  pagination: ImportHistoryPagination;
}

export interface ImportHistoryApiRawResponse {
  items?: ImportHistoryItem[];
  data?: ImportHistoryItem[];
  pagination?: ImportHistoryPagination;
}

export type DuplicateAction = 'ask' | 'create_new' | 'update_existing';

export interface DuplicateImportOptions {
  duplicateAction?: DuplicateAction;
  confirmUpdate?: boolean;
  targetClassId?: string;
}

export interface ImportClassResult {
  success: boolean;
  classId: string;        // classId chính (lớp đầu tiên hoặc ID tổng hợp)
  classIds?: string[];    // Mảng tất cả classId khi import tạo nhiều lớp thi
  message: string;
  action?: 'created' | 'updated' | string;
}

export interface ShareLink {
  id: string;
  token: string;
  shareUrl: string;
  isActive: boolean;
  requireLogin: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateShareLinkPayload {
  expiresInDays?: number;
  requireLogin?: boolean;
}

export interface UpdateShareLinkPayload {
  isActive?: boolean;
  expiresAt?: string | null;
  requireLogin?: boolean;
}

export interface DeleteShareLinkResponse {
  success: boolean;
  message: string;
}

export interface SharedClassInfo {
  id: string;
  classCode: string;
  courseCode?: string;
  courseName?: string;
  semester?: string;
  department?: string;
  classType?: string;
  instructor?: string;
}

export interface SharedClassStudent {
  /** UUID backend của sinh viên, chỉ được trả về khi người xem có quyền điểm danh. */
  studentId?: string;
  mssv: string;
  name?: string;
  fullName?: string;
  photoUrl?: string;
  photoStatus?: string;
  importOrder?: number;
}

/** Thông tin share link để frontend truyền lại khi gọi API điểm danh uỷ quyền. */
export interface ShareContext {
  shareId: string;
  exp: number;
  sig: string;
}

export interface SharedClassResponse {
  classInfo: SharedClassInfo;
  students: SharedClassStudent[];
  /** true khi link requireLogin=true và người xem đã đăng nhập – được phép điểm danh */
  canTakeAttendance: boolean;
  /** Context share link chỉ có khi canTakeAttendance=true */
  shareContext?: ShareContext;
}

