import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShareContext, SharedClassStudent } from '../../roster/services/class.types';
import { attendanceService, AttendanceStatus, ShareTokenParams } from '../../roster/attendance/services/attendance.api';
import {
  AttendanceFilter,
  AttendanceRecord,
  AppMessage,
  getAttendanceStats,
  getLatestMarkedAt,
  mapAttendanceError,
  SavedAttendanceState,
  toAttendanceMap,
} from '../../roster/attendance/services/attendance.service';
import { initSpeech } from '../../../lib/tts/speech.util';

/**
 * Hook quản lý điểm danh trên trang chia sẻ sổ ảnh (dành cho giám thị).
 * Nhận shareContext từ SharedClassResponse để gọi API điểm danh uỷ quyền.
 */
export const useSharedAttendanceController = ({
  classId,
  students,
  shareContext,
}: {
  classId: string;
  students: SharedClassStudent[];
  shareContext: ShareContext;
}) => {
  const shareToken: ShareTokenParams = useMemo(
    () => ({ shareId: shareContext.shareId, exp: shareContext.exp, sig: shareContext.sig }),
    [shareContext]
  );

  const [isAttendanceMode, setAttendanceMode] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<AppMessage>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Map điểm danh bản nháp (chỉ dùng khi đang điểm danh)
  const [initialMap, setInitialMap] = useState<Record<string, AttendanceRecord>>({});
  const [draftMap, setDraftMap] = useState<Record<string, AttendanceRecord>>({});

  // Kết quả điểm danh đã lưu thành công
  const [savedAttendance, setSavedAttendance] = useState<SavedAttendanceState | null>(null);

  // Modal controls
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isRetakeConfirmOpen, setRetakeConfirmOpen] = useState(false);

  // State tính năng "Tự động gọi tên"
  const [isAutoCallEnabled, setAutoCallEnabled] = useState(false);
  const [callingIndex, setCallingIndex] = useState(0);

  // Khởi động TTS
  useEffect(() => { initSpeech(); }, []);

  const attendanceStats = useMemo(() => getAttendanceStats(draftMap), [draftMap]);

  /**
   * Bắt đầu chế độ điểm danh – tải dữ liệu hiện tại từ server.
   */
  const handleStartAttendance = useCallback(async () => {
    if (!classId || students.length === 0) return;

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await attendanceService.getClassAttendance(classId, true, shareToken);
      const records = toAttendanceMap(
        response.students.map((item: { studentId: string; mssv: string; name?: string; status: AttendanceStatus; markedAt: string | null }) => ({
          studentId: item.studentId,
          mssv: item.mssv,
          name: item.name,
          status: item.status,
          markedAt: item.markedAt,
        }))
      );

      setInitialMap(records);
      setDraftMap(records);
      setAttendanceMode(true);
      setAttendanceFilter('all');
      setAttendanceSearch('');
      setSavedAttendance(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: mapAttendanceError(error) });
    } finally {
      setIsBusy(false);
    }
  }, [classId, shareToken, students.length]);

  /**
   * Toggle trạng thái điểm danh cho một sinh viên theo MSSV.
   * Chỉ áp dụng local state (bản nháp), chưa gọi API.
   */
  const handleToggleAttendance = useCallback(
    (mssv: string) => {
      if (!isAttendanceMode) return;

      setDraftMap((prev) => {
        const target = prev[mssv];
        if (!target) return prev;

        const nextStatus: AttendanceStatus = target.status === 'present' ? 'absent' : 'present';
        return {
          ...prev,
          [mssv]: {
            ...target,
            status: nextStatus,
            markedAt: new Date().toISOString(),
          },
        };
      });
    },
    [isAttendanceMode]
  );

  /**
   * Lưu kết quả điểm danh – gọi API setStudentAttendanceStatus cho những sinh viên thay đổi.
   */
  const handleConfirmSaveAttendance = useCallback(async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const changedRecords = Object.values(draftMap).filter(
        (item) => initialMap[item.mssv]?.status !== item.status
      );

      await Promise.all(
        changedRecords.map((item) =>
          attendanceService.setStudentAttendanceStatus(
            classId,
            item.studentId,
            { status: item.status },
            shareToken
          )
        )
      );

      const takenAt = new Date().toISOString();
      setSavedAttendance({
        takenAt,
        stats: getAttendanceStats(draftMap),
        records: draftMap,
      });
      setInitialMap(draftMap);
      setAttendanceMode(false);
      setAttendanceFilter('all');
      setAttendanceSearch('');
      setStatsModalOpen(false);
      setMessage({ type: 'success', text: 'Đã lưu kết quả điểm danh thành công.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: mapAttendanceError(error) });
    } finally {
      setIsBusy(false);
    }
  }, [classId, draftMap, initialMap, shareToken]);

  /**
   * Huỷ điểm danh, phục hồi về bản ghi ban đầu.
   */
  const handleCancelAttendanceMode = useCallback(() => {
    setAttendanceMode(false);
    setDraftMap(initialMap);
    setStatsModalOpen(false);
    setMessage(null);
  }, [initialMap]);

  /**
   * Reset và bắt đầu điểm danh lại (đưa toàn bộ về absent trên local, không gọi reset API).
   */
  const handleConfirmRetakeAttendance = useCallback(async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await attendanceService.getClassAttendance(classId, true, shareToken);
      const records = toAttendanceMap(
        response.students.map((item: { studentId: string; mssv: string; name?: string; status: AttendanceStatus; markedAt: string | null }) => ({
          studentId: item.studentId,
          mssv: item.mssv,
          name: item.name,
          status: item.status,
          markedAt: item.markedAt,
        }))
      );

      setInitialMap(records);
      setDraftMap(records);
      setRetakeConfirmOpen(false);
      setAttendanceMode(true);
      setAttendanceFilter('all');
      setAttendanceSearch('');
      setSavedAttendance(null);
      setMessage({ type: 'success', text: 'Đã tải lại dữ liệu. Bạn có thể bắt đầu điểm danh lại.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: mapAttendanceError(error) });
    } finally {
      setIsBusy(false);
    }
  }, [classId, shareToken]);

  /**
   * Tải dữ liệu điểm danh hiện tại từ server khi vào trang (hydrate).
   */
  const hydrateFromServer = useCallback(async () => {
    if (!classId) return;

    try {
      const response = await attendanceService.getClassAttendance(classId, true, shareToken);
      const records = toAttendanceMap(
        response.students.map((item: { studentId: string; mssv: string; name?: string; status: AttendanceStatus; markedAt: string | null }) => ({
          studentId: item.studentId,
          mssv: item.mssv,
          name: item.name,
          status: item.status,
          markedAt: item.markedAt,
        }))
      );

      const latestMarkedAt = getLatestMarkedAt(records);
      if (!latestMarkedAt) {
        setSavedAttendance(null);
        return;
      }

      setSavedAttendance({
        takenAt: latestMarkedAt,
        stats: response.stats || getAttendanceStats(records),
        records,
      });
      setInitialMap(records);
      setDraftMap(records);
    } catch {
      setSavedAttendance(null);
    }
  }, [classId, shareToken]);

  const activeAttendanceMap = isAttendanceMode ? draftMap : savedAttendance?.records || {};

  // Handler điều hướng gọi tên thủ công
  const handleCallingNext = useCallback(() => { setCallingIndex((prev) => prev + 1); }, []);

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

  return {
    isAttendanceMode,
    isBusy,
    message,
    attendanceFilter,
    attendanceSearch,
    isStatsModalOpen,
    isDetailModalOpen,
    isRetakeConfirmOpen,
    savedAttendance,
    attendanceStats,
    activeAttendanceMap,
    isAutoCallEnabled,
    callingIndex,
    setAutoCallEnabled,
    handleCallingNext,
    handleCallingMarkPresent,
    handleCallingClose,
    setMessage,
    setAttendanceFilter,
    setAttendanceSearch,
    setStatsModalOpen,
    setDetailModalOpen,
    setRetakeConfirmOpen,
    handleStartAttendance,
    handleToggleAttendance,
    handleConfirmSaveAttendance,
    handleCancelAttendanceMode,
    handleConfirmRetakeAttendance,
    hydrateFromServer,
  };
};

export default useSharedAttendanceController;
