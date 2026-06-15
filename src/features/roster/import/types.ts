import { DuplicateImportOptions } from '../services/class.service';

export interface ImportButtonProps {
  onImportSuccess?: (importedClassId?: string) => Promise<void> | void;
}

export type ImportStep = 1 | 2 | 3 | 4 | 5;

export interface ParsedExcelInfo {
  columns: string[];
  mssvColumn?: string;
  nameColumn?: string;
}

export type SourceType = 'excel' | 'gsheet';

export interface DuplicateClassInfo {
  existingClassId: string;
  existingClassLabel: string;
  classExamCode?: string;
  classCode?: string;
  examDate?: string;
  examRoom?: string;
  examTime?: string;
  examShift?: string;
  studentCount: number;
  isFallback: boolean;
  classFieldChanges: Array<{ field: string; oldValue: string; newValue: string }>;
  studentChanges: Array<{ label: string; value: string }>;
  fallbackDiffLines: string[];
}

export interface DuplicateConflictState {
  message: string;
  duplicates: DuplicateClassInfo[];
}

export type DuplicateStepMode = 'choose' | 'confirm-update';

export type MappingMode = 'auto' | 'manual';

export interface ImportSourceOption {
  key: SourceType;
  title: string;
  subtitle: string;
  icon: string;
  isEnabled: boolean;
}

export interface ImportAttemptOptions extends DuplicateImportOptions {
  mappingMode: MappingMode;
}

export interface ImportStateSnapshot {
  isOpen: boolean;
  step: ImportStep;
  stepThreeMode: 'manual' | 'success';
  selectedSource: SourceType;
  selectedFile: File | null;
  googleSheetUrl: string;
  columns: string[];
  autoMssvColumn: string;
  autoNameColumn: string;
  manualMssvColumn: string;
  manualNameColumn: string;
  startRow: number;
  isParsing: boolean;
  isImporting: boolean;
  isDragOver: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  isAutoDetected: boolean;
  pendingMappingMode: MappingMode | null;
  duplicateStepMode: DuplicateStepMode;
  duplicateConflict: DuplicateConflictState | null;
  previewData: ImportPreviewData | null;
  isPreviewLoading: boolean;
}

// Preview types
export interface ImportPreviewExamSession {
  groupKey: string;
  semester: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  department: string;
  classExamCode?: string;
  examDate?: string;
  examRoom?: string;
  examTime?: string;
  examShift?: string;
  studentCount: number;
  importOrder: number;
  isFallback: boolean;
  classCode?: string;
}

export interface ImportPreviewValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreviewData {
  examSessions: ImportPreviewExamSession[];
  validationErrors: ImportPreviewValidationError[];
  stats: { totalRowsRead: number; skippedRows: number; importedRows: number };
  sourceName: string;
}
