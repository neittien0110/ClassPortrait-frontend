import React from 'react';
import ImportButton from '../features/roster/import/components/ImportButton';
import { ActiveView, RosterMeta } from '../features/roster/types';

interface ShellHeaderProps {
  activeView: ActiveView;
  selectedClassExists?: boolean;
  hasStudents?: boolean;
  hasSavedAttendance?: boolean;
  rosterMeta?: RosterMeta;
  isAttendanceMode?: boolean;
  isAttendanceBusy?: boolean;
  onOpenShare?: () => void;
  onStartAttendance?: () => Promise<void> | void;
  onSaveAttendance?: () => void;
  onCancelAttendance?: () => void;
  onStartAiScanner?: () => void;
  onImportSuccess?: (importedClassId?: string) => Promise<void> | void;
}

function ShellHeader({
  activeView,
  selectedClassExists = false,
  hasStudents = false,
  hasSavedAttendance = false,
  rosterMeta = {} as RosterMeta,
  isAttendanceMode = false,
  isAttendanceBusy = false,
  onOpenShare,
  onStartAttendance,
  onSaveAttendance,
  onCancelAttendance,
  onStartAiScanner,
  onImportSuccess,
}: ShellHeaderProps) {
  const title =
    activeView === 'class-list'
      ? 'DANH SÁCH LỚP THI'
      : activeView === 'roster'
        ? 'SỔ ẢNH LỚP THI'
        : activeView === 'dashboard'
          ? 'DASHBOARD GIẢNG VIÊN'
          : activeView === 'history'
            ? 'LỊCH SỬ IMPORT'
            : 'QUẢN LÝ LINK CHIA SẺ';

  return (
    <header className="shell-header d-flex align-items-center justify-content-between">
      <div className="shell-header-content">
        <p className="roster-school">ĐẠI HỌC BÁCH KHOA HÀ NỘI</p>
        <h1>{title}</h1>

        {activeView === 'roster' && (
          <div className="roster-meta" role="list" aria-label="Thông tin lớp học">
            <div className="roster-meta-item" role="listitem"><span>Học kỳ:</span><strong>{rosterMeta.semesterLabel}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Mã HP:</span><strong>{rosterMeta.courseCode}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Môn học:</span><strong>{rosterMeta.courseName}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Mã lớp học:</span><strong>{rosterMeta.classCodeLabel}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Mã lớp thi:</span><strong>{rosterMeta.classExamCode}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Ngày thi:</span><strong>{rosterMeta.examDate}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Phòng thi:</span><strong>{rosterMeta.examRoom}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Giờ thi:</span><strong>{rosterMeta.examTime}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Kíp thi:</span><strong>{rosterMeta.examShift}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>GV giảng dạy:</span><strong>{rosterMeta.instructor}</strong></div>
            <div className="roster-meta-item" role="listitem"><span>Sĩ số:</span><strong>{rosterMeta.studentCountLabel}</strong></div>
          </div>
        )}

      </div>

      {activeView === 'class-list' && (
        <div className="shell-actions ms-auto">
          <ImportButton onImportSuccess={onImportSuccess} />
        </div>
      )}


      {activeView === 'roster' && (
        <div className="shell-actions">
          {isAttendanceMode ? (
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={onCancelAttendance} disabled={isAttendanceBusy}>
                Hủy
              </button>
              {onStartAiScanner && (
                <button type="button" className="btn btn-outline-primary btn-ai" onClick={onStartAiScanner} disabled={isAttendanceBusy}>
                  <i className="bi bi-camera-video me-1"></i> Quét Điểm danh Tự động
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onSaveAttendance} disabled={isAttendanceBusy || !selectedClassExists}>
                Lưu kết quả
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-accent btn-share"
                disabled={!selectedClassExists}
                onClick={onOpenShare}
              >
                Chia sẻ
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={!selectedClassExists || !hasStudents || isAttendanceBusy}
                onClick={onStartAttendance}
              >
                {isAttendanceBusy ? 'Đang tải...' : hasSavedAttendance ? 'Chỉnh sửa điểm danh' : 'Bắt đầu điểm danh'}
              </button>
            </>


          )}
        </div>
      )}
    </header>
  );
}

export default ShellHeader;
