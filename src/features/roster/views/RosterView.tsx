import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useClasses } from '../hooks/useClasses';
import { usePagination } from '../../../hooks/usePagination';
import ShellHeader from '../../../layouts/ShellHeader';
import WorkspaceToolbar from '../../../layouts/WorkspaceToolbar';
import RosterBody from '../components/RosterBody';
import { buildPrintMeta, buildRosterMeta } from '../utils/roster.utils';
import ShareLinkModal from '../share/components/ShareLinkModal';
import { AttendanceStatsModal, AttendanceDetailModal, RetakeConfirmModal } from '../attendance/components/AttendanceModals';
import AppToast from '../../../components/AppToast';
import { AttendanceFilter, useAttendanceController } from '../attendance/hooks/useAttendanceController';
import { useRosterFilteredStudents } from '../attendance/hooks/useRosterFilteredStudents';
import { useRosterController } from '../hooks/useRosterController';
import { PrintHeaderModal, usePrintHeaderController } from '../print';
import { FaceVerificationScanner } from '../attendance/components/ai/FaceVerificationScanner';
import { useFaceModels } from '../attendance/hooks/ai/useFaceModels';
import { ManualCallingBar } from '../attendance/components/ManualCallingBar';

const formatAttendanceTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('vi-VN');
};

function RosterView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { classId } = useParams<{ classId: string }>();
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isAiModeOpen, setAiModeOpen] = useState(false);
  
  // Tải trước và khởi động ấm mô hình AI ngay khi vào trang sổ ảnh để tránh bị trễ/đen camera khi quét
  useFaceModels();
  
  const { classes, selectedClass, students, loading, error, selectClass, refetchClasses } = useClasses({
    enabled: true,
    preferredClassId: classId,
  });

  const {
    headerRef,
    layout,
    handleClassChange,
    handleLayoutChange,
  } = useRosterController({
    selectedClassId: selectedClass?.id,
    selectClass,
  });

  const {
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
    handleStartAttendance,
    handleToggleAttendance,
    handleConfirmSaveAttendance,
    handleCancelAttendanceMode,
    handleConfirmRetakeAttendance,
  } = useAttendanceController({
    selectedClass,
    students,
    activeView: 'roster',
  });

  const filteredStudents = useRosterFilteredStudents({
    students,
    attendanceSearch,
    isAttendanceMode,
    attendanceFilter,
    savedAttendance,
  });

  const { photosPerRow } = usePagination(filteredStudents, layout);

  useEffect(() => {
    document.body.setAttribute('data-layout', photosPerRow.toString());

    return () => {
      document.body.removeAttribute('data-layout');
    };
  }, [photosPerRow]);

  useEffect(() => {
    if (!isAttendanceMode) {
      setAiModeOpen(false);
    }
  }, [isAttendanceMode]);

  // Tự động kích hoạt hành động nếu được yêu cầu từ Dashboard (thông qua location.state)
  useEffect(() => {
    if (loading || !selectedClass) return;

    const state = location.state as { autoStartAttendance?: boolean; autoOpenShare?: boolean } | null;
    if (!state) return;

    if (state.autoStartAttendance && !isAttendanceMode && students.length > 0) {
      handleStartAttendance();
    } else if (state.autoOpenShare) {
      setShareModalOpen(true);
    }

    // Xóa state để tránh kích hoạt lại khi refresh hoặc quay lại
    navigate(location.pathname, { replace: true, state: {} });
  }, [loading, selectedClass, location.state, isAttendanceMode, students.length, handleStartAttendance, navigate, location.pathname]);

  const rosterMeta = buildRosterMeta(selectedClass, students);
  const printMeta = buildPrintMeta(selectedClass, filteredStudents);
  const {
    isModalOpen: isPrintHeaderModalOpen,
    activeConfig: printHeaderConfig,
    draftConfig: draftPrintHeaderConfig,
    errorMessage: printHeaderError,
    openModal: openPrintHeaderModal,
    closeModal: closePrintHeaderModal,
    updateDraftConfig,
    uploadImage,
    clearDraftImage,
    applyDraftConfig,
  } = usePrintHeaderController(printMeta);

  const handleOpenPrintModal = () => {
    openPrintHeaderModal();
  };

  const handleApplyHeaderAndPrint = () => {
    applyDraftConfig();
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  return (
    <>
      <div className="sticky-controls no-print" ref={headerRef}>
        <ShellHeader
          activeView="roster"
          selectedClassExists={Boolean(selectedClass)}
          hasStudents={students.length > 0}
          hasSavedAttendance={Boolean(savedAttendance)}
          rosterMeta={rosterMeta}
          isAttendanceMode={isAttendanceMode}
          isAttendanceBusy={isAttendanceBusy}
          isAutoCallEnabled={isAutoCallEnabled}
          onOpenShare={() => setShareModalOpen(true)}
          onStartAttendance={handleStartAttendance}
          onSaveAttendance={() => setStatsModalOpen(true)}
          onCancelAttendance={handleCancelAttendanceMode}
          onStartAiScanner={() => setAiModeOpen(true)}
          onToggleAutoCall={setAutoCallEnabled}
        />

        <div className="roster-controls-combined">
          <WorkspaceToolbar
            selectedClass={selectedClass}
            studentsCount={filteredStudents.length}
            photosPerRow={photosPerRow}
            loading={loading}
            searchQuery={attendanceSearch}
            onLayoutChange={handleLayoutChange}
            onSearchChange={(event) => setAttendanceSearch(event.target.value)}
            onPrint={handleOpenPrintModal}
          />

          {!isAttendanceMode && savedAttendance && (
            <div className="attendance-summary-panel">
              <div className="attendance-summary-row">
                <div className="attendance-summary-meta">
                  Đã điểm danh lúc: <strong>{formatAttendanceTime(savedAttendance.takenAt)}</strong>
                </div>

                <div className="attendance-summary-stats">
                  <span>
                    Có mặt: <strong className="text-success">{savedAttendance.stats.present}</strong>
                  </span>
                  <span>
                    Vắng: <strong className="text-danger">{savedAttendance.stats.absent}</strong>
                  </span>
                  <span>
                    Tỉ lệ: <strong>{savedAttendance.stats.total > 0 ? Math.round((savedAttendance.stats.present / savedAttendance.stats.total) * 100) : 0}%</strong>
                  </span>
                </div>

                <div className="attendance-summary-filter">
                  <select
                    className="form-select"
                    value={attendanceFilter}
                    onChange={(event) => setAttendanceFilter(event.target.value as AttendanceFilter)}
                    aria-label="Lọc danh sách điểm danh"
                  >
                    <option value="all">Tất cả</option>
                    <option value="present">Có mặt</option>
                    <option value="absent">Vắng</option>
                  </select>
                </div>

                <div className="attendance-summary-actions">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setRetakeConfirmOpen(true)}>
                    Điểm danh lại
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setDetailModalOpen(true)}>
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAttendanceMode && isAiModeOpen && (
        <FaceVerificationScanner
          students={filteredStudents}
          activeAttendanceMap={activeAttendanceMap}
          onToggleAttendance={handleToggleAttendance}
          onClose={() => setAiModeOpen(false)}
          classId={selectedClass?.id ?? ''}
          isAutoCallEnabled={isAutoCallEnabled}
          onToggleAutoCall={setAutoCallEnabled}
        />
      )}

      {/* Thanh gọi tên thủ công - hiển thị khi điểm danh thủ công và bật Tự động gọi tên */}
      {isAttendanceMode && !isAiModeOpen && isAutoCallEnabled && (
        <ManualCallingBar
          students={students.map((s) => ({ id: s.id ?? s.mssv, mssv: s.mssv, fullName: s.fullName || s.name || s.mssv }))}
          callingIndex={callingIndex}
          presentCount={Object.values(activeAttendanceMap).filter((r) => r.status === 'present').length}
          onMarkPresent={handleCallingMarkPresent}
          onSkip={handleCallingNext}
          onClose={handleCallingClose}
          isAutoCallEnabled={isAutoCallEnabled}
        />
      )}

      <RosterBody
        loading={loading}
        error={error}
        students={filteredStudents}
        printMeta={printMeta}
        printHeaderConfig={printHeaderConfig}
        isAttendanceMode={isAttendanceMode}
        attendanceByMssv={activeAttendanceMap}
        onToggleAttendance={handleToggleAttendance}
      />

      <ShareLinkModal
        isOpen={isShareModalOpen}
        selectedClass={selectedClass}
        onClose={() => setShareModalOpen(false)}
      />

      <AttendanceStatsModal
        isOpen={isStatsModalOpen}
        present={attendanceStats.present}
        absent={attendanceStats.absent}
        total={attendanceStats.total}
        onCancel={() => setStatsModalOpen(false)}
        onConfirm={handleConfirmSaveAttendance}
        isSubmitting={isAttendanceBusy}
      />

      <AttendanceDetailModal
        isOpen={isDetailModalOpen}
        rows={detailRows}
        classLabel={rosterMeta.classCodeLabel}
        onClose={() => setDetailModalOpen(false)}
      />

      <RetakeConfirmModal
        isOpen={isRetakeConfirmOpen}
        onCancel={() => setRetakeConfirmOpen(false)}
        onConfirm={handleConfirmRetakeAttendance}
        isSubmitting={isAttendanceBusy}
      />

      {attendanceMessage && (
        <AppToast message={attendanceMessage} onClose={() => setAttendanceMessage(null)} className="no-print" />
      )}

      <PrintHeaderModal
        isOpen={isPrintHeaderModalOpen}
        draftConfig={draftPrintHeaderConfig}
        printMeta={printMeta}
        errorMessage={printHeaderError}
        onClose={closePrintHeaderModal}
        onApplyAndPrint={handleApplyHeaderAndPrint}
        onUpdateDraft={updateDraftConfig}
        onUploadImage={uploadImage}
        onClearImage={clearDraftImage}
      />
    </>
  );
}

export default RosterView;
