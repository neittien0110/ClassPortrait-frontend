/**
 * Kiểu dữ liệu dành riêng cho tính năng xuất PDF danh sách thí sinh dự thi.
 */

/** Thông tin một sinh viên trong bảng PDF */
export interface ExamCandidateStudent {
  order: number;        // STT
  mssv: string;         // Mã số sinh viên
  fullName: string;     // Họ và tên
  dob?: string;         // Ngày sinh đã format (dd/mm/yyyy)
  classCode: string;    // Mã lớp tín chỉ (dùng cho header "Mã lớp học" – backup)
  className?: string;   // Tên lớp sinh viên – dùng cho cột "Lớp" trong bảng (e.g. "*Việt Nhật K69 -4C")
}

/** Thông tin một lớp thi kèm danh sách sinh viên – dùng để render 1 trang PDF */
export interface ExamSessionPDFData {
  // Thông tin lớp thi
  courseCode: string;
  courseName: string;
  semester: string;
  department: string;
  instructor: string;
  classExamCode?: string;   // Mã lớp thi (nếu có)
  classCodes: string[];     // Các mã lớp tín chỉ của lớp thi này
  // Ngày/giờ thi (đã format sẵn)
  examDateRaw?: string;     // Giá trị thô để render nếu đã format
  examDateFormatted?: string; // "Thứ ba, 30/06/2026"
  examRoom?: string;          // "B1-204"
  examTimeFormatted?: string; // "12h30"
  examShift?: string;         // "3"
  // Danh sách sinh viên
  students: ExamCandidateStudent[];
}
