import React from 'react';
import { ExamTimelineItem } from '../types';
import { formatExamTime } from '../utils/dashboardHelpers';

interface RoomGanttChartProps {
  exams: ExamTimelineItem[];
  selectedDate: string;
}

/**
 * Biểu đồ Gantt Lịch sử dụng phòng thi.
 * Mỗi hàng là 1 phòng, các block màu thể hiện môn thi đang chiếm dụng phòng theo từng kíp/thời gian.
 */
function RoomGanttChart({ exams, selectedDate }: RoomGanttChartProps) {
  const filteredExams = exams.filter((e) => e.examDate === selectedDate);

  if (filteredExams.length === 0) {
    return (
      <div className="dash-chart-empty">
        <p>Không có dữ liệu sử dụng phòng cho ngày {selectedDate}</p>
      </div>
    );
  }

  // Danh sách phòng (Trục Y)
  const rooms = Array.from(
    new Set(filteredExams.map((e) => e.examRoom).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  // Danh sách kíp thi (Trục X)
  const shifts = Array.from(
    new Set(filteredExams.map((e) => e.examShift).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  // Mapping kíp -> giờ thi
  const shiftTimeMap: Record<string, string> = {};
  filteredExams.forEach(e => {
    if (e.examShift && e.examTime && !shiftTimeMap[e.examShift]) {
      shiftTimeMap[e.examShift] = formatExamTime(e.examTime);
    }
  });

  // Tạo palette màu đơn giản cho các môn học khác nhau
  const getColorForCourse = (courseCode: string) => {
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
      hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 85%)`; // Màu pastel
  };

  const getBorderColorForCourse = (courseCode: string) => {
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
      hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 45%)`;
  };

  return (
    <div className="dash-gantt-wrapper">
      <div className="dash-gantt-header-row">
        <div className="dash-gantt-room-label fw-bold bg-light border-end">Phòng / Kíp</div>
        <div className="dash-gantt-timeline">
          {shifts.map((shift) => (
            <div key={shift} className="dash-gantt-time-slot bg-light text-center border-end py-1">
              <div className="d-flex flex-column align-items-center">
                <span className="text-primary fw-bold" style={{ fontSize: '0.95rem' }}>
                  {shiftTimeMap[shift] || '--:--'}
                </span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Kíp {shift}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-gantt-body">
        {rooms.map((room) => (
          <div key={room} className="dash-gantt-row border-bottom">
            <div className="dash-gantt-room-label fw-semibold border-end">
              {room}
            </div>
            <div className="dash-gantt-timeline">
              {shifts.map((shift) => {
                const examInSlot = filteredExams.find(
                  (e) => (e.examShift || e.examTime || 'Chưa xác định') === shift && e.examRoom === room
                );

                return (
                  <div key={`${room}-${shift}`} className="dash-gantt-time-slot border-end position-relative">
                    {examInSlot && (
                      <div
                        className="dash-gantt-block"
                        title={`${examInSlot.courseCode} - ${examInSlot.courseName} (${examInSlot.studentCount} SV)`}
                        style={{
                          backgroundColor: getColorForCourse(examInSlot.courseCode),
                          borderColor: getBorderColorForCourse(examInSlot.courseCode),
                        }}
                      >
                        <span className="dash-gantt-course-code fw-bold">
                          {examInSlot.courseCode}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomGanttChart;
