import { ExamTimelineItem } from '../types';

/**
 * Format tỷ lệ phần trăm thành chuỗi hiển thị.
 * @param value Giá trị số hoặc null.
 * @returns Chuỗi phần trăm hoặc '--' nếu null.
 */
export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${Math.round(value)}%`;
};

/**
 * Format timestamp ISO thành chuỗi ngày giờ theo locale Việt Nam.
 * @param value Chuỗi ISO timestamp.
 * @returns Chuỗi ngày giờ đã định dạng.
 */
export const formatGeneratedAt = (value: string): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

/**
 * Format chuỗi ngày 'YYYY-MM-DD' thành dạng 'dd/MM/yyyy'.
 * @param dateStr Chuỗi ngày ISO.
 * @returns Chuỗi ngày đã định dạng hoặc '--'.
 */
export const formatExamDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Format giờ thi (hỗ trợ cả dạng string HH:mm và số thập phân Excel 0.xxxx).
 * @param timeValue Giá trị giờ thi từ DB.
 * @returns Chuỗi giờ thi định dạng hh:mm:ss.
 */
export const formatExamTime = (timeValue: string | null | undefined): string => {
  if (!timeValue) return '--:--';

  // Nếu là số thập phân (Excel time - ví dụ 0.3333333333333333)
  const num = parseFloat(timeValue);
  if (!Number.isNaN(num) && num > 0 && num < 1 && String(timeValue).includes('.')) {
    const totalSeconds = Math.round(num * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  }

  // Nếu là dạng HH:mm:ss.sss, cắt bỏ phần miligiây
  if (String(timeValue).includes(':')) {
    return String(timeValue).split('.')[0];
  }

  return String(timeValue);
};

/**
 * Trả về nhãn ca thi hiển thị (ưu tiên examShift, fallback examTime).
 * @param item Dữ liệu lớp thi sắp diễn ra.
 * @returns Chuỗi nhãn ca thi.
 */
export const getExamShiftLabel = (item: ExamTimelineItem): string => {
  if (item.examShift) return item.examShift;
  if (item.examTime) return item.examTime;
  return 'Chưa xác định';
};

/**
 * Tính màu progress bar tỷ lệ ảnh dựa trên ngưỡng.
 * @param rate Tỷ lệ phần trăm ảnh hợp lệ (0-100).
 * @returns Bootstrap color class name.
 */
export const getPhotoRateColor = (rate: number): string => {
  if (rate >= 100) return 'success';
  if (rate >= 80) return 'info';
  if (rate >= 50) return 'warning';
  return 'danger';
};

/**
 * Tính màu cho tỷ lệ điểm danh.
 * @param rate Tỷ lệ phần trăm có mặt (0-100) hoặc null.
 * @returns Bootstrap color class name.
 */
export const getAttendanceRateColor = (rate: number | null): string => {
  if (rate === null) return 'secondary';
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'warning';
  return 'danger';
};

/**
 * Kiểm tra ngày thi có phải hôm nay không.
 * @param dateStr Chuỗi ngày 'YYYY-MM-DD'.
 * @returns true nếu là hôm nay.
 */
export const isToday = (dateStr: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
};

/**
 * Kiểm tra ngày thi có phải trong tuần này không.
 * @param dateStr Chuỗi ngày 'YYYY-MM-DD'.
 * @returns true nếu trong tuần này.
 */
export const isThisWeek = (dateStr: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diffToMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const d = new Date(dateStr);
  return d >= startOfWeek && d <= endOfWeek;
};

/**
 * Trả về label ngày thi thân thiện (Hôm nay / Tuần này / ngày cụ thể).
 * @param dateStr Chuỗi ngày 'YYYY-MM-DD'.
 * @returns Chuỗi nhãn thân thiện.
 */
export const getFriendlyDateLabel = (dateStr: string): string => {
  if (isToday(dateStr)) return 'Hôm nay';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
};
