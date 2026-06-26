/**
 * Interface định nghĩa cấu trúc dữ liệu của một sinh viên
 */
export interface Student {
  id?: string;
  mssv: string;
  name?: string;
  fullName?: string;
  photoUrl?: string;        // URL ảnh có chữ ký do backend cấp
  photoStatus?: string;     // trạng thái ảnh: 'found' | 'not_found' | ...
  importOrder?: number;     // thứ tự theo file Excel gốc
  // Thông tin học vụ
  classCode?: string;       // Mã lớp tín chỉ (lớp quản lý)
  className?: string;       // Tên lớp quản lý
  gender?: string;          // Giới tính
  dob?: string | Date;      // Ngày sinh
  email?: string;           // Email
  notes?: string;           // Ghi chú
}
