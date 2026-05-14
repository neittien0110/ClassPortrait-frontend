import React from 'react';
import { ExamTimelineItem } from '../types';
import { formatPercent, formatExamTime } from '../utils/dashboardHelpers';

interface RoomShiftMatrixProps {
  exams: ExamTimelineItem[];
  selectedDate: string;
}

/**
 * Bảng Ma trận Số sinh viên mỗi phòng - kíp.
 * Trục ngang: Phòng thi. Trục dọc: Kíp thi.
 */
function RoomShiftMatrix({ exams, selectedDate }: RoomShiftMatrixProps) {
  // Lọc danh sách thi theo ngày được chọn
  const filteredExams = exams.filter((e) => e.examDate === selectedDate);

  if (filteredExams.length === 0) {
    return (
      <div className="dash-chart-empty">
        <p>Không có lịch thi nào trong ngày {selectedDate || 'này'}</p>
      </div>
    );
  }

  // Lấy danh sách phòng thi độc nhất (có thi trong ngày)
  const rooms = Array.from(
    new Set(filteredExams.map((e) => e.examRoom).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  // Lấy danh sách kíp thi độc nhất
  const shifts = Array.from(new Set(filteredExams.map((e) => e.examShift))).sort() as string[];

  // Lấy mapping kíp -> giờ thi để hiển thị tiêu đề hàng
  const shiftTimeMap: Record<string, string> = {};
  filteredExams.forEach(e => {
    if (e.examShift && e.examTime && !shiftTimeMap[e.examShift]) {
      shiftTimeMap[e.examShift] = formatExamTime(e.examTime);
    }
  });

  // Hàm tạo Tooltip title
  const getTooltipContent = (exam: ExamTimelineItem) => {
    return `Môn: ${exam.courseCode} - ${exam.courseName}\nĐiểm danh: ${exam.attendanceRate !== null ? formatPercent(exam.attendanceRate) : 'Chưa có'
      }\nẢnh: ${formatPercent(exam.validPhotoRate)}`;
  };

  return (
    <div className="dash-matrix-wrapper">
      <div className="dash-matrix-header">
        <h4 className="dash-matrix-title">Số sinh viên mỗi phòng - kíp</h4>
        <div className="dash-matrix-meta">
          <span>Ngày thi: <strong>{selectedDate}</strong></span>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered dash-matrix-table align-middle">
          <thead>
            <tr>
              <th className="matrix-col-header matrix-col-fixed bg-light">Kíp / Phòng </th>
              {rooms.map((room) => (
                <th key={room} className="matrix-col-header bg-light text-center">
                  {room}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift}>
                <td className="matrix-row-header bg-light">
                  <div className="d-flex flex-column">
                    <span className="text-primary fw-bold" style={{ fontSize: '1rem' }}>
                      {shiftTimeMap[shift] || '--:--'}
                    </span>
                    <span className="text-muted small">Kíp {shift}</span>
                  </div>
                </td>
                {rooms.map((room) => {
                  const examInCell = filteredExams.find(
                    (e) => e.examShift === shift && e.examRoom === room
                  );

                  if (!examInCell) {
                    return <td key={`${shift}-${room}`} className="text-center text-muted">-</td>;
                  }

                  const attRate = examInCell.attendanceRate ?? 0;
                  const isLowAtt = examInCell.attendanceRate !== null && attRate < 50;

                  return (
                    <td
                      key={`${shift}-${room}`}
                      className={`text-center fw-semibold ${isLowAtt ? 'text-danger' : 'text-primary'}`}
                      title={getTooltipContent(examInCell)}
                      style={{ cursor: 'help' }}
                    >
                      {examInCell.studentCount}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RoomShiftMatrix;
