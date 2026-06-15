import api from '../../../../lib/api';
import { ShareTokenParams } from './attendance.api';

/**
 * Lỗi khi Backend từ chối vì khuôn mặt không khớp (HTTP 422 FACE_MISMATCH).
 * Frontend xử lý im lặng — tiếp tục quét bình thường.
 */
export class FaceMismatchError extends Error {
  constructor(public readonly matchScore?: number) {
    super('FACE_MISMATCH');
    this.name = 'FaceMismatchError';
  }
}

/**
 * Lỗi kỹ thuật khi gọi API ai-verify (lỗi mạng, 5xx, timeout...).
 * Frontend cần hiện thông báo toast để người dùng biết có sự cố.
 */
export class AiVerifyNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiVerifyNetworkError';
  }
}

/**
 * Gửi face descriptor lên Backend để xác thực và ghi nhận điểm danh.
 *
 * @param classId UUID lớp học.
 * @param studentId UUID sinh viên cần xác thực.
 * @param descriptor Float32Array 128 chiều từ camera (live descriptor).
 * @param shareToken Context share link dành cho giám thị (tuỳ chọn).
 * @returns { status: 'present', matchScore: number } nếu xác thực thành công.
 * @throws {FaceMismatchError} nếu Backend trả về 422 FACE_MISMATCH (không khớp mặt).
 * @throws {AiVerifyNetworkError} nếu lỗi mạng, 5xx, hoặc timeout.
 */
export async function aiVerifyAndMark(
  classId: string,
  studentId: string,
  descriptor: Float32Array,
  shareToken?: ShareTokenParams,
): Promise<{ status: string; matchScore: number }> {
  try {
    const response = await api.post<{ status: string; matchScore: number }>(
      `/classes/${classId}/attendance/students/${studentId}/ai-verify`,
      { descriptor: Array.from(descriptor) },
      {
        params: shareToken
          ? { shareId: shareToken.shareId, exp: shareToken.exp, sig: shareToken.sig }
          : undefined,
      },
    );
    return response.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const errorCode = err?.response?.data?.error;

    // 422 FACE_MISMATCH: khuôn mặt không khớp — im lặng
    if (status === 422 && errorCode === 'FACE_MISMATCH') {
      const matchScore = err?.response?.data?.matchScore;
      throw new FaceMismatchError(matchScore);
    }

    // 422 NO_FACE_IN_REFERENCE: ảnh thẻ không nhận diện được mặt — báo lỗi
    if (status === 422 && errorCode === 'NO_FACE_IN_REFERENCE') {
      throw new AiVerifyNetworkError(
        'Ảnh thẻ sinh viên không có khuôn mặt nhận diện được. Vui lòng xác nhận thủ công.',
      );
    }

    // Các lỗi kỹ thuật còn lại: mạng, 5xx, 503...
    const message =
      err?.response?.data?.message ||
      (err?.code === 'ECONNABORTED' ? 'Kết nối quá thời gian chờ' : 'Lỗi kết nối với máy chủ');
    throw new AiVerifyNetworkError(message);
  }
}
