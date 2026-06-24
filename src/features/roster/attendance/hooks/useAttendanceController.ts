import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Class } from '../../../../types/Class';
import { Student } from '../../../../types/Student';
import { useAutoDismissMessage } from '../../../../hooks/useAutoDismissMessage';
import { ActiveView } from '../../types';
import {
  AppMessage,
  AttendanceFilter,
  AttendanceRecord,
  buildAttendanceDetailRows,
  getAttendanceStats,
  SavedAttendanceState,
} from '../services/attendance.service';
import { useAttendanceActions } from './useAttendanceActions';
import { initSpeech } from '../../../../lib/tts/speech.util';

export type { AttendanceFilter } from '../services/attendance.service';

interface UseAttendanceControllerOptions {
  selectedClass: Class | null;
  students: Student[];
  activeView: ActiveView;
}

/**
 * Controller gom toàn bộ state và nghiệp vụ điểm danh để AppShell nhẹ hơn.
 */
export const useAttendanceController = ({
  selectedClass,
  students,
  activeView,
}: UseAttendanceControllerOptions) => {
  const selectedClassIdRef = useRef<string | null>(null);
  const [isAttendanceMode, setAttendanceMode] = useState(false);
  const [isAttendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<AppMessage>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isRetakeConfirmOpen, setRetakeConfirmOpen] = useState(false);
  const [attendanceInitialMap, setAttendanceInitialMap] = useState<Record<string, AttendanceRecord>>({});
  const [attendanceDraftMap, setAttendanceDraftMap] = useState<Record<string, AttendanceRecord>>({});

  // State cho tính năng "Tự động gọi tên"
  const [isAutoCallEnabled, setAutoCallEnabled] = useState(false);
  const [callingIndex, setCallingIndex] = useState(0);
  const [savedAttendance, setSavedAttendance] = useState<SavedAttendanceState | null>(null);

  // Khởi động TTS sớm để trình duyệt kịp load danh sách giọng
  useEffect(() => {
    initSpeech();
  }, []);

  const {
    clearAttendanceState,
    hydrateSavedAttendanceFromServer,
    handleStartAttendance,
    handleToggleAttendance,
    handleConfirmSaveAttendance,
    handleCancelAttendanceMode,
    handleConfirmRetakeAttendance,
  } = useAttendanceActions({
    selectedClassId: selectedClass?.id,
    selectedClass,
    studentsCount: students.length,
    isAttendanceMode,
    attendanceInitialMap,
    attendanceDraftMap,
    setAttendanceMode,
    setAttendanceBusy,
    setAttendanceMessage,
    setAttendanceFilter,
    setAttendanceSearch,
    setStatsModalOpen,
    setDetailModalOpen,
    setRetakeConfirmOpen,
    setAttendanceInitialMap,
    setAttendanceDraftMap,
    setSavedAttendance,
  });

  const attendanceStats = useMemo(() => getAttendanceStats(attendanceDraftMap), [attendanceDraftMap]);

  const detailRows = useMemo(() => buildAttendanceDetailRows(students, savedAttendance), [savedAttendance, students]);

  const activeAttendanceMap = isAttendanceMode ? attendanceDraftMap : savedAttendance?.records || {};

  // Tự động bỏ qua các sinh viên đã có mặt
  useEffect(() => {
    if (!isAutoCallEnabled || callingIndex >= students.length) return;

    let nextIndex = callingIndex;
    while (nextIndex < students.length) {
      const student = students[nextIndex];
      const record = attendanceDraftMap[student.mssv];
      if (record?.status === 'present') {
        nextIndex++;
      } else {
        break;
      }
    }

    if (nextIndex !== callingIndex) {
      setCallingIndex(nextIndex);
    }
  }, [callingIndex, isAutoCallEnabled, students, attendanceDraftMap]);

  // Hàm điều hướng gọi tên thủ công
  const handleCallingNext = useCallback(() => {
    setCallingIndex((prev) => prev + 1);
  }, []);

  const handleCallingMarkPresent = useCallback(
    (mssv: string) => {
      handleToggleAttendance(mssv);
      setCallingIndex((prev) => prev + 1);
    },
    [handleToggleAttendance]
  );

  const handleCallingClose = useCallback(() => {
    setAutoCallEnabled(false);
    setCallingIndex(0);
  }, []);

  // Reset calling index khi bắt đầu điểm danh lại
  const wrappedStartAttendance = useCallback(
    async (classIdOverride?: string) => {
      setCallingIndex(0);
      await handleStartAttendance(classIdOverride);
    },
    [handleStartAttendance]
  );

  useEffect(() => {
    const nextClassId = selectedClass?.id || null;

    if (selectedClassIdRef.current && selectedClassIdRef.current !== nextClassId) {
      clearAttendanceState();
      setAutoCallEnabled(false);
      setCallingIndex(0);
    }

    selectedClassIdRef.current = nextClassId;
  }, [clearAttendanceState, selectedClass?.id]);

  useEffect(() => {
    if (!selectedClass?.id || isAttendanceMode || activeView !== 'roster') {
      return;
    }

    hydrateSavedAttendanceFromServer(selectedClass.id);
  }, [activeView, hydrateSavedAttendanceFromServer, isAttendanceMode, selectedClass?.id]);

  useAutoDismissMessage(attendanceMessage, () => setAttendanceMessage(null));

  return {
    isAttendanceMode,
    isAttendanceBusy,
    attendanceMessage,
    attendanceFilter,
    attendanceSearch,
    isStatsModalOpen,
    isDetailModalOpen,
    isRetakeConfirmOpen,
    savedAttendance,
    attendanceStats,
    detailRows,
    activeAttendanceMap,
    // Voice / Auto-call
    isAutoCallEnabled,
    callingIndex,
    setAutoCallEnabled,
    handleCallingNext,
    handleCallingMarkPresent,
    handleCallingClose,
    setAttendanceMessage,
    setAttendanceFilter,
    setAttendanceSearch,
    setStatsModalOpen,
    setDetailModalOpen,
    setRetakeConfirmOpen,
    handleStartAttendance: wrappedStartAttendance,
    handleToggleAttendance,
    handleConfirmSaveAttendance,
    handleCancelAttendanceMode,
    handleConfirmRetakeAttendance,
  };
};

export default useAttendanceController;
