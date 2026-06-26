/**
 * Các hàm tiện ích định dạng dữ liệu cho PDF danh sách thí sinh dự thi.
 */

const DAY_OF_WEEK_VI: Record<number, string> = {
  0: 'Chủ nhật',
  1: 'Thứ hai',
  2: 'Thứ ba',
  3: 'Thứ tư',
  4: 'Thứ năm',
  5: 'Thứ sáu',
  6: 'Thứ bảy',
};

/**
 * Định dạng ngày thi theo chuẩn "Thứ ba, 30/06/2026".
 * @param dateValue Chuỗi ngày ISO hoặc Date object.
 * @returns Chuỗi ngày đã định dạng.
 */
export function formatExamDateVi(dateValue: string | Date | undefined | null): string {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return String(dateValue);

  const dayName = DAY_OF_WEEK_VI[d.getDay()] ?? '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${dayName}, ${day}/${month}/${year}`;
}

/**
 * Định dạng ngày sinh "dd/mm/yyyy".
 * @param dateValue Chuỗi ngày hoặc Date.
 * @returns Chuỗi ngày sinh đã định dạng.
 */
export function formatDob(dateValue: string | Date | undefined | null): string {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return String(dateValue);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng giờ thi thành dạng "12h30" (bỏ giây nếu giây = 0).
 * @param timeStr Chuỗi thời gian dạng "HH:MM:SS" hoặc "HH:MM".
 * @returns Chuỗi giờ thi đẹp.
 */
export function formatExamTime(timeStr: string | undefined | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}h${m}`;
}

/**
 * Trả về tên file PDF theo format: DanhSachDuThi_<courseCode>_<semester>.pdf
 */
export function buildPdfFileName(courseCode: string, semester: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9\-_.]/g, '_');
  return `DanhSachDuThi_${safe(courseCode)}_HK${safe(semester)}.pdf`;
}
