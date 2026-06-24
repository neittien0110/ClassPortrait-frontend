import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useFaceModels } from '../../hooks/ai/useFaceModels';
import { useWebcam } from '../../hooks/ai/useWebcam';
import { useFaceVerification } from '../../hooks/ai/useFaceVerification';
import {
  DEFAULT_FACE_DISTANCE_THRESHOLD,
  FACE_SIMILARITY_THRESHOLD_OPTIONS,
} from '../../hooks/ai/useFaceVerification';
import { CameraOverlay } from './CameraOverlay';
import { RecentScansLog, ScannedStudent } from './RecentScansLog';
import { speak, buildCallText, buildPresentText } from '../../../../../lib/tts/speech.util';
import { aiVerifyFace, FaceMismatchError } from '../../services/attendance.ai';
import { ShareTokenParams } from '../../services/attendance.api';

interface FaceVerificationScannerProps {
  students: any[];
  activeAttendanceMap: Record<string, any>;
  onToggleAttendance: (mssv: string) => void;
  onClose: () => void;
  /** UUID lớp học — cần để gọi API ai-verify */
  classId: string;
  /** Share token dành cho giám thị (undefined nếu là chủ lớp) */
  shareToken?: ShareTokenParams;
  /** Bật/tắt tính năng đọc tên tự động */
  isAutoCallEnabled?: boolean;
  /** Callback thay đổi trạng thái đọc tên */
  onToggleAutoCall?: (enabled: boolean) => void;
}

export const FaceVerificationScanner: React.FC<FaceVerificationScannerProps> = ({
  students,
  activeAttendanceMap,
  onToggleAttendance,
  onClose,
  classId,
  shareToken,
  isAutoCallEnabled = false,
  onToggleAutoCall,
}) => {
  const { modelsLoaded, loadingError } = useFaceModels();
  const { videoRef, isCameraActive, cameraError, startCamera, stopCamera } = useWebcam();

  const [autoMode, setAutoMode] = useState(true);
  const [distanceThreshold, setDistanceThreshold] = useState<number>(
    DEFAULT_FACE_DISTANCE_THRESHOLD,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recentScans, setRecentScans] = useState<ScannedStudent[]>([]);

  // Ô tìm kiếm nhanh
  const [searchQuery, setSearchQuery] = useState('');

  // Các trạng thái hỗ trợ việc trì hoãn (delay) hiển thị kết quả thành công
  const [isPaused, setIsPaused] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toast lỗi kỹ thuật (lỗi mạng, 5xx...) — tự dismiss sau 4 giây
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dọn dẹp timeout khi component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (errorToastTimerRef.current) clearTimeout(errorToastTimerRef.current);
    };
  }, []);

  // Lọc sinh viên chưa điểm danh
  const pendingStudents = useMemo(() => {
    return students.filter(s => {
      const record = activeAttendanceMap[s.mssv];
      return !record || record.status !== 'present';
    });
  }, [students, activeAttendanceMap]);

  // Lọc theo từ khóa tìm kiếm (hỗ trợ tiếng Việt không dấu và chữ thường)
  const filteredPendingStudents = useMemo(() => {
    if (!searchQuery.trim()) return pendingStudents;
    const cleanQuery = searchQuery.toLowerCase().trim();
    return pendingStudents.filter(s =>
      s.fullName.toLowerCase().includes(cleanQuery) ||
      s.mssv.toLowerCase().includes(cleanQuery)
    );
  }, [pendingStudents, searchQuery]);

  const currentStudent = filteredPendingStudents[currentIndex];

  // Đọc tên khi sinh viên được chọn thay đổi (tránh đọc lại khi re-render không đổi người)
  const lastSpokenStudentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAutoCallEnabled || !currentStudent || isPaused) return;
    if (lastSpokenStudentIdRef.current === currentStudent.id) return;

    lastSpokenStudentIdRef.current = currentStudent.id;
    speak(buildCallText(currentStudent.fullName, currentStudent.mssv));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStudent?.id, isAutoCallEnabled, isPaused]);

  // Reset index về 0 mỗi khi người dùng thay đổi từ khóa tìm kiếm
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery]);

  // Chỉ chạy phân tích hình ảnh khi không trong chế độ tạm dừng
  const {
    verificationResult,
    verificationWindow,
    refImageError,
    getAggregatedLiveDescriptor,
    resetVerificationWindow,
  } = useFaceVerification(
    videoRef,
    isCameraActive && !isPaused,
    modelsLoaded,
    currentStudent ? currentStudent.photoUrl : null,
    distanceThreshold,
  );

  // Khởi động camera khi model AI đã sẵn sàng
  useEffect(() => {
    if (modelsLoaded) {
      startCamera();
    }
    return () => stopCamera();
  }, [modelsLoaded, startCamera, stopCamera]);

  // Reset index khi danh sách thay đổi hoặc đã hết
  useEffect(() => {
    if (currentIndex >= filteredPendingStudents.length) {
      setCurrentIndex(Math.max(0, filteredPendingStudents.length - 1));
    }
  }, [filteredPendingStudents.length, currentIndex]);

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: hiện toast lỗi kỹ thuật, tự dismiss sau 4s
  // ────────────────────────────────────────────────────────────────────────────
  const showErrorToast = useCallback((message: string) => {
    setErrorToast(message);
    if (errorToastTimerRef.current) clearTimeout(errorToastTimerRef.current);
    errorToastTimerRef.current = setTimeout(() => {
      setErrorToast(null);
    }, 4000);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: phát tiếng bíp xác nhận
  // ────────────────────────────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: logic UI thành công (chung cho cả auto và thủ công)
  // Hiện success banner, phát bíp, TTS, rồi sau 2s gọi onToggleAttendance
  // ────────────────────────────────────────────────────────────────────────────
  const triggerSuccessUI = useCallback((student: any, score?: number, method: 'ai' | 'manual' = 'ai') => {
    if (method === 'manual' || score === undefined) {
      setSuccessMessage(`Xác nhận thủ công sinh viên ${student.fullName}`);
    } else {
      setSuccessMessage(`Xác nhận đúng sinh viên ${student.fullName} - Tương đồng ${score}%`);
    }

    // Thêm vào log quét gần đây
    setRecentScans(prev => {
      const newLog = [{
        studentId: student.id,
        mssv: student.mssv,
        fullName: student.fullName,
        photoUrl: student.photoUrl,
        scannedAt: new Date(),
        matchScore: score,
        method
      }, ...prev];
      return newLog.slice(0, 5);
    });

    playBeep();

    if (isAutoCallEnabled) {
      speak(buildPresentText(student.fullName));
    }

    // Sau 2 giây: cập nhật state local rồi resume scanning
    timeoutRef.current = setTimeout(() => {
      onToggleAttendance(student.mssv);
      setIsPaused(false);
      setSuccessMessage(null);
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoCallEnabled, playBeep, onToggleAttendance]);

  // ────────────────────────────────────────────────────────────────────────────
  // AUTO VERIFY: xác nhận sớm khi 5/5 inference liên tiếp đều đạt ngưỡng; nếu có frame
  // nhiễu thì tiếp tục chờ cửa sổ 7 inference và yêu cầu ít nhất 5 lần đạt.
  // Gửi descriptor lên Backend → backend chỉ verify → nếu ok thì cập nhật bản nháp qua triggerSuccessUI.
  // Không làm gì nếu: mismatch (im lặng) / lỗi kỹ thuật (toast + resume).
  // ────────────────────────────────────────────────────────────────────────────
  const handleVerifyAuto = useCallback(async () => {
    if (!currentStudent || isPaused) return;

    const liveDescriptor = getAggregatedLiveDescriptor();
    if (!liveDescriptor) {
      // Không có đủ descriptor đạt ngưỡng → bỏ qua cửa sổ hiện tại.
      resetVerificationWindow();
      return;
    }

    // Pause scanning ngay lập tức để tránh gọi API nhiều lần
    setIsPaused(true);
    resetVerificationWindow();

    try {
      const result = await aiVerifyFace(
        classId,
        currentStudent.id,
        liveDescriptor,
        distanceThreshold,
        shareToken,
      );
      // Backend xác nhận → hiện UI thành công
      triggerSuccessUI(currentStudent, result.matchScore);
    } catch (err) {
      if (err instanceof FaceMismatchError) {
        // Khuôn mặt không khớp → im lặng, resume quét
        setIsPaused(false);
      } else {
        // Lỗi kỹ thuật → hiện toast, resume quét
        setIsPaused(false);
        const message = (err as Error).message || 'Lỗi kết nối. Vui lòng thử lại.';
        showErrorToast(message);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, currentStudent, isPaused, getAggregatedLiveDescriptor, distanceThreshold, resetVerificationWindow, shareToken, triggerSuccessUI, showErrorToast]);

  // ────────────────────────────────────────────────────────────────────────────
  // MANUAL CONFIRM: Nút "Xác nhận" bấm tay — bypass AI, tin tưởng giảng viên.
  // Giữ nguyên logic cũ: chỉ update local state (không gọi AI verify API).
  // API PUT thực sự chỉ được gọi khi bấm "Lưu" ở màn hình chính.
  // ────────────────────────────────────────────────────────────────────────────
  const handleConfirmManual = useCallback(() => {
    if (!currentStudent || isPaused) return;

    setIsPaused(true);
    triggerSuccessUI(currentStudent, undefined, 'manual');
  }, [currentStudent, isPaused, triggerSuccessUI]);

  // ────────────────────────────────────────────────────────────────────────────
  // Logic Auto-Mode: nhánh nhanh 3/3 và nhánh chịu nhiễu 5/7. frameId bảo
  // đảm effect chỉ phản ứng với inference mới, không tự tăng theo render React.
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !isPaused &&
      autoMode &&
      currentStudent &&
      verificationWindow.isAccepted
    ) {
      handleVerifyAuto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationWindow.frameId, verificationWindow.isAccepted, autoMode, currentStudent, isPaused]);

  const handleSkip = () => {
    if (currentIndex < filteredPendingStudents.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleUndo = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const record = student ? activeAttendanceMap[student.mssv] : null;
    if (student && record && record.status === 'present') {
      onToggleAttendance(student.mssv);
    }
    setRecentScans(prev => prev.filter(s => s.studentId !== studentId));
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1055 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aiScannerModalTitle"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '960px' }}>
          <div className="modal-content bg-white text-dark border shadow-lg">

            {/* Header */}
            <div className="modal-header border-bottom align-items-center bg-white px-3 py-2">
              <div className="d-flex align-items-center gap-3 flex-grow-1">
                <h5 className="modal-title text-dark mb-0 d-flex align-items-center fw-bold" id="aiScannerModalTitle" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-person-bounding-box me-2 text-primary" />
                  Quét Mặt
                </h5>

                {/* Ô tìm kiếm nhanh tích hợp trên Header */}
                <div className="position-relative" style={{ width: '220px' }}>
                  <i className="bi bi-search position-absolute text-muted" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }} />
                  <input
                    type="text"
                    className="form-control form-control-sm border ps-4 pe-4 bg-light text-dark"
                    placeholder="Tìm mssv hoặc tên"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isPaused}
                    style={{ borderRadius: '20px', fontSize: '0.85rem', height: '32px' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 position-absolute text-muted"
                      style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', textDecoration: 'none', border: 'none', background: 'none' }}
                      onClick={() => setSearchQuery('')}
                      disabled={isPaused}
                    >
                      <i className="bi bi-x-circle-fill" />
                    </button>
                  )}

                  {/* Dropdown kết quả tìm kiếm thả xuống */}
                  {searchQuery.trim() !== '' && (
                    <div
                      className="position-absolute bg-white border rounded shadow-lg mt-1 w-100 overflow-auto"
                      style={{ zIndex: 1060, maxHeight: '220px', top: '100%', left: 0 }}
                    >
                      <div className="list-group list-group-flush">
                        {filteredPendingStudents.map((s, idx) => (
                          <button
                            key={s.id}
                            type="button"
                            className={`list-group-item list-group-item-action py-2 px-3 border-bottom text-start ${idx === currentIndex ? 'active bg-primary text-white' : 'text-dark bg-white'}`}
                            style={{ fontSize: '0.8rem', border: 'none' }}
                            onClick={() => setCurrentIndex(idx)}
                            disabled={isPaused}
                          >
                            <div className="fw-bold text-truncate">{s.fullName}</div>
                            <div className={idx === currentIndex ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.7rem' }}>{s.mssv}</div>
                          </button>
                        ))}
                        {filteredPendingStudents.length === 0 && (
                          <div className="text-center text-muted py-3" style={{ fontSize: '0.8rem' }}>
                            Không tìm thấy sinh viên
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Nhóm điều khiển Tự động & Nút Đóng */}
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <label
                    className="form-label mb-0 text-dark fw-medium"
                    htmlFor="faceDistanceThreshold"
                    style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                  >
                    Ngưỡng pass
                  </label>
                  <select
                    id="faceDistanceThreshold"
                    className="form-select form-select-sm"
                    value={distanceThreshold}
                    onChange={(event) => {
                      setDistanceThreshold(Number(event.target.value));
                      resetVerificationWindow();
                    }}
                    disabled={isPaused}
                    aria-label="Chọn ngưỡng phần trăm tương đồng để xác nhận khuôn mặt"
                    title="Ví dụ 70% nghĩa là khuôn mặt cần đạt ít nhất 70% điểm tương đồng hiển thị trên khung camera"
                    style={{ width: '118px' }}
                  >
                    {FACE_SIMILARITY_THRESHOLD_OPTIONS.map((option) => (
                      <option key={option.score} value={option.distanceThreshold}>
                        {option.score}%
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-check form-switch text-dark mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="autoModeSwitch"
                    checked={autoMode}
                    onChange={(e) => setAutoMode(e.target.checked)}
                    disabled={isPaused}
                  />
                  <label className="form-check-label fw-medium" htmlFor="autoModeSwitch">
                    Tự động Xác nhận
                  </label>
                </div>

                {/* Switch Tự động gọi tên */}
                <div className="form-check form-switch text-dark mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="autoCallSwitch"
                    checked={isAutoCallEnabled}
                    onChange={(e) => onToggleAutoCall?.(e.target.checked)}
                    disabled={isPaused}
                  />
                  <label className="form-check-label fw-medium d-flex align-items-center gap-1" htmlFor="autoCallSwitch">
                    <i className="bi bi-mic text-primary" style={{ fontSize: '0.9rem' }} />
                    Tự động gọi tên
                  </label>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Đóng"
                  onClick={onClose}
                  disabled={isPaused}
                />
              </div>
            </div>

            {/* Body */}
            <div className="modal-body p-3 bg-white">
              {/* Toast lỗi kỹ thuật — hiện khi có lỗi mạng/503 */}
              {errorToast && (
                <div
                  className="alert alert-warning d-flex align-items-center justify-content-between py-2 mb-3"
                  role="alert"
                  style={{ fontSize: '0.9rem' }}
                >
                  <span>
                    <i className="bi bi-wifi-off me-2" />
                    {errorToast}
                  </span>
                  <button
                    type="button"
                    className="btn-close btn-sm ms-2"
                    onClick={() => setErrorToast(null)}
                  />
                </div>
              )}

              {/* Alert thông báo xác nhận thành công */}
              {successMessage && (
                <div
                  className="alert alert-success d-flex align-items-center justify-content-center py-2 mb-3 shadow"
                  role="alert"
                  style={{ fontSize: '1.1rem', fontWeight: 'bold', animation: 'fadeInDown 0.3s ease' }}
                >
                  <i className="bi bi-check-circle-fill me-2" style={{ fontSize: '1.3rem' }}></i>
                  {successMessage}
                </div>
              )}

              {loadingError ? (
                <div className="alert alert-danger">{loadingError}</div>
              ) : !modelsLoaded ? (
                <div className="text-center py-5 text-dark">
                  <div className="spinner-border text-primary mb-3" role="status" />
                  <p className="mb-0 text-muted">Đang tải mô hình AI. Vui lòng chờ...</p>
                </div>
              ) : (
                <div className="row g-3">
                  {/* Cột trái: Camera */}
                  <div className="col-md-7">
                    <div
                      className="position-relative bg-black rounded overflow-hidden"
                      style={{
                        minHeight: '320px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: successMessage ? '3px solid #198754' : '3px solid #dee2e6',
                        transition: 'border-color 0.3s ease'
                      }}
                    >
                      {cameraError ? (
                        <div className="text-danger text-center p-4">{cameraError}</div>
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', transform: 'scaleX(-1)' }}
                          />
                          {!isPaused && (
                            <CameraOverlay
                              videoRef={videoRef}
                              box={verificationResult?.box}
                              isMatch={verificationResult?.isMatch || false}
                              matchScore={verificationResult?.matchScore || 0}
                            />
                          )}
                        </>
                      )}
                    </div>

                    <RecentScansLog scans={recentScans} onUndo={handleUndo} />
                  </div>

                  {/* Cột phải: Thông tin đối soát */}
                  <div className="col-md-5 d-flex flex-column">
                    {currentStudent ? (
                      <div
                        className="card border-0 text-white flex-grow-1 shadow-sm"
                        style={{
                          backgroundColor: successMessage ? '#198754' : '#f8f9fa',
                          color: successMessage ? '#ffffff' : '#212529',
                          border: successMessage ? 'none' : '1px solid #dee2e6',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div className={`card-header ${successMessage ? 'bg-success text-white border-bottom-0' : 'bg-light text-dark border-bottom'} fw-bold`}>
                          Sinh viên ({currentIndex + 1}/{filteredPendingStudents.length})
                        </div>
                        <div className="card-body text-center d-flex flex-column justify-content-center align-items-center py-4">
                          <div className="position-relative mb-3">
                            <img
                              src={currentStudent.photoUrl}
                              alt={currentStudent.fullName}
                              className="rounded-circle border border-3 border-light shadow"
                              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%236c757d"/><text x="75" y="80" text-anchor="middle" fill="%23fff" font-size="20">${currentStudent.mssv}</text></svg>`;
                              }}
                            />
                            {refImageError && (
                              <span
                                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                title={refImageError}
                              >
                                <i className="bi bi-exclamation-triangle" />
                              </span>
                            )}
                          </div>
                          <h4 className={`fw-bold mb-1 ${successMessage ? 'text-white' : 'text-dark'}`}>{currentStudent.fullName}</h4>
                          <p className={`mb-0 ${successMessage ? 'text-light' : 'text-muted'}`}>MSSV: {currentStudent.mssv}</p>
                          <p className={`${successMessage ? 'text-light' : 'text-muted'}`}>Lớp: {currentStudent.classCode}</p>

                          <div className="mt-auto pt-4 w-100 d-flex gap-2">
                            <button className="btn btn-outline-danger flex-grow-1" onClick={handleSkip} disabled={isPaused}>
                              <i className="bi bi-arrow-right-circle me-1" /> Bỏ qua
                            </button>
                            {/*
                              Nút "Xác nhận" thủ công: bypass AI, tin tưởng quyết định của giảng viên.
                              Ghi nhận local state ngay, API PUT thực sự được gọi khi bấm "Lưu".
                            */}
                            <button
                              className={`btn ${verificationResult?.isMatch ? 'btn-success' : 'btn-outline-success'} flex-grow-1`}
                              onClick={handleConfirmManual}
                              disabled={isPaused}
                            >
                              <i className="bi bi-check-circle me-1" /> Xác nhận
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="card bg-light border text-dark d-flex align-items-center justify-content-center p-4 text-center flex-grow-1" style={{ minHeight: '300px' }}>
                        {searchQuery.trim() ? (
                          <>
                            <i className="bi bi-search display-3 text-warning mb-3" />
                            <h5 className="fw-bold">Không có kết quả</h5>
                            <p className="text-muted mb-0">Không tìm thấy sinh viên chưa điểm danh nào khớp với từ khóa "{searchQuery}".</p>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-all display-1 text-success mb-3" />
                            <h5 className="fw-bold text-success">Đã hoàn thành</h5>
                            <p className="text-muted mb-0">Tất cả sinh viên trong danh sách đã được điểm danh.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );

  // Render vào document.body qua Portal để thoát khỏi stacking context của trang cha
  return ReactDOM.createPortal(modalContent, document.body);
};
