export const sourceOptions = [
  { value: 'all', label: 'Tất cả nguồn' },
  { value: 'excel', label: 'Excel' },
  { value: 'google_sheet', label: 'Google Sheet' },
] as const;

export const sourceTypeLabel: Record<string, string> = {
  excel: 'Excel',
  google_sheet: 'Google Sheet',
};

export const actionLabel: Record<string, string> = {
  created: 'Tạo mới',
  updated: 'Cập nhật',
};

export const classFieldLabel: Record<string, string> = {
  classCode: 'Mã lớp',
  semester: 'Học kỳ',
  courseCode: 'Mã học phần',
  courseName: 'Tên học phần',
  instructor: 'Giảng viên',
  department: 'Đơn vị',
  examDate: 'Ngày thi',
  examRoom: 'Phòng thi',
  examTime: 'Giờ thi',
  shift: 'Kíp thi',
  proctor: 'Giám thị',
};

export const studentChangeLabel: Record<string, string> = {
  added: 'Thêm mới',
  removed: 'Bị xóa',
  renamed: 'Đổi tên',
  updated: 'Cập nhật',
  unchanged: 'Giữ nguyên',
};
