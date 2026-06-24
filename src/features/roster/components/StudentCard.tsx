// src/components/StudentCard.tsx
import React, { useState } from 'react';
import { PHOTO_CONFIG } from '../../../config/constants';
import { AttendanceStatus } from '../attendance/services/attendance.api';

interface StudentCardProps {
  mssv: string;
  name?: string;
  fullName?: string;
  photoUrl?: string;
  attendanceStatus?: AttendanceStatus;
  isAttendanceMode?: boolean;
  showAttendanceStatus?: boolean;
  onToggleAttendance?: () => void;
}

/**
 * Component hiển thị thẻ sinh viên với ảnh và thông tin
 * Dùng photoUrl từ API (đã có chữ ký), không tự ghép URL.
 */
function StudentCard({
  mssv,
  name,
  fullName,
  photoUrl,

  attendanceStatus,
  isAttendanceMode,
  showAttendanceStatus,
  onToggleAttendance,
}: StudentCardProps) {
  const [imageError, setImageError] = useState(false);
  const effectiveSrc = !imageError && photoUrl ? photoUrl : PHOTO_CONFIG.PLACEHOLDER_URL;
  const statusLabel = attendanceStatus === 'present' ? 'Có mặt' : 'Vắng';

  /**
   * Xử lý thao tác click/keyboard để đổi trạng thái điểm danh của thí sinh.
   * @param event Sự kiện click hoặc keyboard đến từ card.
   * @returns Không trả về giá trị.
   */
  const handleToggle = (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.preventDefault();

    if (!isAttendanceMode || !onToggleAttendance) {
      return;
    }

    onToggleAttendance();
  };

  return (
    <div
      id={`student-card-${mssv}`}
      className={`card student-card ${isAttendanceMode ? 'is-attendance-mode' : ''}`}
      role={isAttendanceMode ? 'button' : undefined}
      tabIndex={isAttendanceMode ? 0 : undefined}
      onClick={handleToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleToggle(event);
        }
      }}
      aria-pressed={isAttendanceMode ? attendanceStatus === 'present' : undefined}
      aria-label={isAttendanceMode ? `${statusLabel} - ${mssv}` : undefined}
    >
      <div className="student-card-image-wrap">
        <img
          src={effectiveSrc}
          className="card-img-top"
          alt={`Ảnh của sinh viên ${mssv}`}
          onError={() => setImageError(true)}
        />
        {isAttendanceMode && attendanceStatus && (
          <div className={`student-card-attendance-overlay ${attendanceStatus === 'present' ? 'is-present' : 'is-absent'}`}>
            {statusLabel}
          </div>
        )}
      </div>
      <div className="card-body">
        <h6 className="card-title">{mssv}</h6>
        {(fullName || name) && <span className="student-name">{fullName || name}</span>}
        {!isAttendanceMode && showAttendanceStatus && attendanceStatus && (
          <span className={`attendance-status-chip mt-2 ${attendanceStatus === 'present' ? 'is-present' : 'is-absent'}`}>
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default StudentCard;
