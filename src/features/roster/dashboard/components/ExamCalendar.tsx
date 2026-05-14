import React, { useState, useRef, useEffect } from 'react';

interface ExamCalendarProps {
  selectedDate: string;
  availableDates: string[]; // "YYYY-MM-DD"
  onDateSelect: (date: string) => void;
}

/**
 * Component Lịch nội bộ dùng cho DatePicker.
 */
const CalendarSheet: React.FC<ExamCalendarProps> = ({
  selectedDate,
  availableDates,
  onDateSelect,
}) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate || new Date()));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const isSelected = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  const hasExam = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDates.includes(dateStr);
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  return (
    <div className="exam-calendar-sheet">
      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
        <span className="fw-bold small">{monthNames[month]} {year}</span>
        <div className="d-flex gap-1">
          <button className="btn btn-xs btn-light border" onClick={handlePrevMonth}>
            <i className="bi bi-chevron-left" style={{ fontSize: '0.7rem' }}></i>
          </button>
          <button className="btn btn-xs btn-light border" onClick={handleNextMonth}>
            <i className="bi bi-chevron-right" style={{ fontSize: '0.7rem' }}></i>
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
          const exam = hasExam(day);
          const active = isSelected(day);
          return (
            <div
              key={day}
              className={`calendar-day ${exam ? 'has-exam' : ''} ${active ? 'active' : ''}`}
              onClick={() => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                onDateSelect(dateStr);
              }}
            >
              {day}
              {exam && <div className="exam-dot"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Component DatePicker: Khi ấn vào mới hiện Lịch.
 */
const ExamDatePicker: React.FC<ExamCalendarProps> = ({
  selectedDate,
  availableDates,
  onDateSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date: string) => {
    onDateSelect(date);
    setIsOpen(false);
  };

  return (
    <div className="exam-datepicker-container" ref={containerRef}>
      <button 
        className="btn btn-white border shadow-sm d-flex align-items-center gap-2 px-3 py-2"
        onClick={() => setIsOpen(!isOpen)}
        style={{ minWidth: '180px', background: '#fff' }}
      >
        <i className="bi bi-calendar3 text-primary"></i>
        <span className="fw-semibold">{selectedDate || 'Chọn ngày...'}</span>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} ms-auto small text-muted`}></i>
      </button>

      {isOpen && (
        <div className="exam-datepicker-popover shadow-lg border rounded-3 bg-white p-3">
          <CalendarSheet
            selectedDate={selectedDate}
            availableDates={availableDates}
            onDateSelect={handleDateSelect}
          />
          <div className="mt-2 pt-2 border-top d-flex gap-3" style={{ fontSize: '0.7rem' }}>
            <div className="d-flex align-items-center">
              <span className="calendar-legend-dot bg-warning me-1" style={{ width: '6px', height: '6px' }}></span> Có lịch thi
            </div>
            <div className="text-muted ms-auto italic">Bấm để chọn</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDatePicker;
