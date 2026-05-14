import React from 'react';
import { ExamTimelineItem } from '../types';
import {
  formatPercent,
  formatExamTime,
  getPhotoRateColor,
  getAttendanceRateColor,
  isToday,
} from '../utils/dashboardHelpers';

interface UpcomingExamsListProps {
  exams: ExamTimelineItem[];
  onOpenClass: (classId: string) => void;
}

/**
 * Render badge trạng thái ảnh theo tỷ lệ.
 * @param rate Tỷ lệ ảnh hợp lệ (0-100).
 * @returns Badge JSX.
 */
function PhotoRateBadge({ rate }: { rate: number }) {
  const color = getPhotoRateColor(rate);
  return (
    <span className={`dash-badge text-bg-${color}`}>
      Ảnh: {formatPercent(rate)}
    </span>
  );
}

/**
 * Render badge trạng thái điểm danh.
 * @param rate Tỷ lệ có mặt hoặc null.
 * @param absentCount Số vắng hoặc null.
 * @returns Badge JSX.
 */
function AttendanceBadge({ rate, absentCount }: { rate: number | null; absentCount: number | null }) {
  if (rate === null) {
    return <span className="dash-badge text-bg-secondary">Chưa điểm danh</span>;
  }
  const color = getAttendanceRateColor(rate);
  return (
    <span className={`dash-badge text-bg-${color}`}>
      Điểm danh: {formatPercent(rate)} {absentCount !== null && absentCount > 0 && `(vắng ${absentCount})`}
    </span>
  );
}

/**
 * Danh sách lịch thi sắp diễn ra theo timeline.
 * Thiết kế dạng Card ngang (Horizontal) theo yêu cầu.
 * @param props Danh sách lớp sắp thi và handler điều hướng.
 * @returns JSX danh sách timeline.
 */
function UpcomingExamsList({ exams, onOpenClass }: UpcomingExamsListProps) {
  if (exams.length === 0) {
    return (
      <div className="dash-empty-state">
        <p>Không có lịch thi nào sắp tới.</p>
      </div>
    );
  }

  return (
    <div className="dash-exam-list-horizontal">
      {exams.map((exam) => {
        const isExamToday = isToday(exam.examDate);
        const dayName = new Date(exam.examDate).toLocaleDateString('vi-VN', { weekday: 'short' });
        const dateShort = new Date(exam.examDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return (
          <button
            key={exam.classId}
            type="button"
            className={`dash-exam-h-card ${isExamToday ? 'is-today' : ''}`}
            onClick={() => onOpenClass(exam.classId)}
          >
            {/* Cột 1: Ngày tháng */}
            <div className="dash-h-card-date">
              <span className="h-date-day">{dayName}</span>
              <span className="h-date-val">{dateShort}</span>
            </div>

            <div className="dash-h-card-divider"></div>

            {/* Cột 2: Thông tin môn học */}
            <div className="dash-h-card-content">
              <div className="dash-h-card-title">
                <span className="h-course-code">{exam.courseCode}</span>
                <span className="h-course-name">{exam.courseName}</span>
                <span className="h-title-divider">|</span>
                <div className="dash-h-card-meta">
                  <span className="h-meta-item" title="Giờ & Kíp thi">
                    <i className="bi bi-clock me-1"></i>
                    {exam.examShift ? `Kíp ${exam.examShift}` : ''}
                    {exam.examTime ? ` (${formatExamTime(exam.examTime)})` : ''}
                  </span>
                  <span className="h-meta-item" title="Phòng thi">
                    <i className="bi bi-building me-1"></i>
                    {exam.examRoom ?? 'Chưa có phòng'}
                  </span>
                  <span className="h-meta-item" title="Số sinh viên">
                    <i className="bi bi-people me-1"></i>
                    {exam.studentCount} SV
                  </span>
                </div>
              </div>
            </div>

            {/* Cột 3: Trạng thái Badges */}
            <div className="dash-h-card-status">
              <PhotoRateBadge rate={exam.validPhotoRate} />
              <AttendanceBadge rate={exam.attendanceRate} absentCount={exam.absentCount} />
              <span className="h-arrow-icon">
                <i className="bi bi-chevron-right"></i>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default UpcomingExamsList;
