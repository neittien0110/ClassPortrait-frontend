import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { speak, buildCallText, stopSpeech } from '../../../../lib/tts/speech.util';

interface CallingStudent {
  id: string;
  mssv: string;
  fullName: string;
}

interface ManualCallingBarProps {
  /** Danh sách sinh viên theo thứ tự gốc */
  students: CallingStudent[];
  /** Index sinh viên đang được gọi */
  callingIndex: number;
  /** Tổng số đã điểm danh xong */
  presentCount: number;
  /** Callback khi bấm "Có mặt" */
  onMarkPresent: (mssv: string) => void;
  /** Callback khi bấm "Vắng / Bỏ qua" */
  onSkip: () => void;
  /** Callback khi đóng / kết thúc gọi tên */
  onClose: () => void;
  /** Cho phép bật/tắt từ bên ngoài */
  isAutoCallEnabled: boolean;
}

/**
 * Thanh công cụ nổi (Floating Bar) hiển thị khi đang gọi tên thủ công.
 * Hỗ trợ phím tắt: Space = Có mặt, ArrowRight = Vắng/Tiếp theo, Escape = Đóng.
 *
 * Lưu ý: lần đầu tiên hiển thị, người dùng cần bấm nút "Bắt đầu gọi" để
 * "kích hoạt" Web Speech API (trình duyệt yêu cầu user gesture để phát âm thanh).
 * Từ lần thứ hai trở đi, hệ thống tự động đọc.
 */
export const ManualCallingBar: React.FC<ManualCallingBarProps> = ({
  students,
  callingIndex,
  presentCount,
  onMarkPresent,
  onSkip,
  onClose,
  isAutoCallEnabled,
}) => {
  const currentStudent = students[callingIndex] ?? null;
  const total = students.length;
  const hasMore = callingIndex < total - 1;

  // Trạng thái: đã "kích hoạt" giọng nói chưa (cần user gesture lần đầu)
  const [voiceActivated, setVoiceActivated] = useState(false);

  // Theo dõi index đã đọc để tránh đọc lại khi re-render
  const lastSpokenIndexRef = useRef<number>(-1);

  // Sau khi đã kích hoạt, tự động đọc khi index thay đổi
  useEffect(() => {
    if (!isAutoCallEnabled || !currentStudent) return;
    
    // Tự động cuộn đến sinh viên đang gọi
    const el = document.getElementById(`student-card-${currentStudent.mssv}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (!voiceActivated) return;
    if (lastSpokenIndexRef.current === callingIndex) return;

    lastSpokenIndexRef.current = callingIndex;
    speak(buildCallText(currentStudent.fullName, currentStudent.mssv));
  }, [callingIndex, currentStudent, isAutoCallEnabled, voiceActivated]);

  // Dọn dẹp TTS khi component unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Hàm kích hoạt giọng nói lần đầu (cần gắn vào user gesture)
  const handleActivateAndSpeak = useCallback(() => {
    setVoiceActivated(true);
    if (currentStudent) {
      lastSpokenIndexRef.current = callingIndex;
      speak(buildCallText(currentStudent.fullName, currentStudent.mssv));
    }
  }, [callingIndex, currentStudent]);

  // Phím tắt: + = Có mặt, - = Vắng/Tiếp, Esc = Đóng
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        if (!voiceActivated) { handleActivateAndSpeak(); return; }
        if (currentStudent) onMarkPresent(currentStudent.mssv);
      } else if (e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        if (!voiceActivated) { handleActivateAndSpeak(); return; }
        onSkip();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [currentStudent, onMarkPresent, onSkip, onClose, voiceActivated, handleActivateAndSpeak]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isAutoCallEnabled) return null;

  const btnBase: React.CSSProperties = {
    borderRadius: '9px',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s',
    padding: '7px 14px',
  };

  const barContent = (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        minWidth: '520px',
        maxWidth: '90vw',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.07)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: '#f1f5f9',
      }}
      role="dialog"
      aria-label="Thanh gọi tên điểm danh"
    >
      {/* Icon mic */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: voiceActivated ? 'rgba(99, 102, 241, 0.35)' : 'rgba(100,116,139,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${voiceActivated ? 'rgba(99, 102, 241, 0.6)' : 'rgba(100,116,139,0.4)'}`,
          transition: 'all 0.3s',
        }}
      >
        <i className="bi bi-mic-fill" style={{ color: voiceActivated ? '#818cf8' : '#64748b', fontSize: '1.1rem' }} />
      </div>

      {/* Thông tin sinh viên */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {currentStudent ? (
          <>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px', fontWeight: 500 }}>
              Gọi tên ({callingIndex + 1}/{total}) · {presentCount} có mặt
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentStudent.fullName}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', letterSpacing: '0.03em' }}>
              {currentStudent.mssv}
            </div>
          </>
        ) : (
          <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '0.95rem' }}>
            <i className="bi bi-check2-all me-2" />
            Đã gọi hết danh sách!
          </div>
        )}
      </div>

      {/* Nút hành động */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>

        {/* --- Chưa kích hoạt: hiển thị nút Bắt đầu --- */}
        {!voiceActivated && currentStudent && (
          <button
            type="button"
            onClick={handleActivateAndSpeak}
            title="Bắt đầu gọi tên (cần click một lần để kích hoạt giọng nói)"
            style={{
              ...btnBase,
              border: '1px solid rgba(129,140,248,0.5)',
              background: 'rgba(99,102,241,0.2)',
              color: '#a5b4fc',
              fontWeight: 700,
              padding: '7px 18px',
            }}
          >
            <i className="bi bi-play-fill" />
            Bắt đầu gọi
          </button>
        )}

        {/* --- Đã kích hoạt: hiển thị nút điều hướng --- */}
        {voiceActivated && currentStudent && (
          <>
            <button
              type="button"
              onClick={onSkip}
              title="Vắng / Tiếp theo (-)"
              style={{
                ...btnBase,
                border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.12)',
                color: '#fca5a5',
              }}
            >
              <i className="bi bi-arrow-right-circle" />
              Vắng{hasMore ? '' : ' / Kết thúc'}
              <kbd style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: '2px' }}>-</kbd>
            </button>

            <button
              type="button"
              onClick={() => onMarkPresent(currentStudent.mssv)}
              title="Có mặt (+)"
              style={{
                ...btnBase,
                border: '1px solid rgba(74,222,128,0.4)',
                background: 'rgba(74,222,128,0.15)',
                color: '#4ade80',
                fontWeight: 700,
              }}
            >
              <i className="bi bi-check-circle-fill" />
              Có mặt
              <kbd style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: '2px' }}>+</kbd>
            </button>

            {/* Nút đọc lại */}
            <button
              type="button"
              onClick={() => speak(buildCallText(currentStudent.fullName, currentStudent.mssv))}
              title="Đọc lại tên"
              style={{
                padding: '7px 10px',
                borderRadius: '9px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
          </>
        )}

        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          title="Kết thúc gọi tên (Esc)"
          style={{
            padding: '7px 10px',
            borderRadius: '9px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(barContent, document.body);
};

export default ManualCallingBar;
