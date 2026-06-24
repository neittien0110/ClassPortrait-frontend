import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { classService, SharedClassResponse } from '../../roster/services/class.service';
import { useAuth } from '../../auth';
import { useSharedAttendanceController } from '../hooks/useSharedAttendanceController';
import {
  AttendanceStatsModal,
  AttendanceDetailModal,
  RetakeConfirmModal,
} from '../../roster/attendance/components/AttendanceModals';
import { buildAttendanceDetailRows, AttendanceFilter } from '../../roster/attendance/services/attendance.service';
import { FaceVerificationScanner } from '../../roster/attendance/components/ai/FaceVerificationScanner';
import { useFaceModels } from '../../roster/attendance/hooks/ai/useFaceModels';
import ShellHeader from '../../../layouts/ShellHeader';
import WorkspaceToolbar from '../../../layouts/WorkspaceToolbar';
import RosterBody from '../../roster/components/RosterBody';
import { buildPrintMeta, buildRosterMeta } from '../../roster/utils/roster.utils';
import { PrintHeaderModal, usePrintHeaderController } from '../../roster/print';
import { useRosterFilteredStudents } from '../../roster/attendance/hooks/useRosterFilteredStudents';
import { usePagination } from '../../../hooks/usePagination';
import AppToast from '../../../components/AppToast';
import { ManualCallingBar } from '../../roster/attendance/components/ManualCallingBar';

interface SharedClassPageProps {
  id: string;
  exp: string;
  sig: string;
}

/**
 * Ánh xạ lỗi HTTP thành thông báo tiếng Việt cho người dùng cuối.
 * Trả về chuỗi đặc biệt 'LOGIN_REQUIRED' thay vì throw khi gặp 401.
 * @param error Lỗi axios hoặc lỗi bất kỳ từ API call.
 * @returns Chuỗi mô tả lỗi hoặc 'LOGIN_REQUIRED' sentinel.
 */
const mapPublicError = (error: any): string => {
  const status = error?.response?.status;

  if (status === 401) {
    return 'LOGIN_REQUIRED';
  }

  if (status === 400) {
    return 'Link chia sẻ thiếu tham số hoặc sai định dạng.';
  }

  if (status === 403) {
    return 'Link chia sẻ đã hết hạn, bị vô hiệu hoặc đã bị chỉnh sửa.';
  }

  if (status === 404) {
    return 'Link chia sẻ không tồn tại.';
  }

  return 'Không thể tải dữ liệu sổ ảnh. Vui lòng thử lại sau.';
};

const AVAILABLE_LAYOUTS = [4, 5, 6] as const;

/**
 * Lấy layout ban đầu từ query param hoặc mặc định 5 cột.
 * @returns Số cột hợp lệ trong AVAILABLE_LAYOUTS.
 */
const getInitialLayout = (params: URLSearchParams): (typeof AVAILABLE_LAYOUTS)[number] => {
  const value = Number(params.get('layout'));

  return AVAILABLE_LAYOUTS.includes(value as (typeof AVAILABLE_LAYOUTS)[number])
    ? (value as (typeof AVAILABLE_LAYOUTS)[number])
    : 5;
};

// Component chính: SharedClassPage

// ─────────────────────────────────────────────────────────────────────────────
// Component chính: SharedClassPage
// ─────────────────────────────────────────────────────────────────────────────

function SharedClassPage({ id, exp, sig }: SharedClassPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [payload, setPayload] = useState<SharedClassResponse | null>(null);
  const [layout, setLayout] = useState<(typeof AVAILABLE_LAYOUTS)[number]>(() => getInitialLayout(searchParams));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAiModeOpen, setAiModeOpen] = useState(false);

  // Pre-warm mô hình AI ngay khi vào trang (tránh delay khi mở scanner)
  useFaceModels();

  // Hook điểm danh của giám thị – chỉ khởi tạo khi canTakeAttendance=true
  const canTakeAttendance = Boolean(payload?.canTakeAttendance && payload?.shareContext);

  const sharedAttendance = useSharedAttendanceController({
    classId: payload?.classInfo?.id ?? '',
    students: payload?.students ?? [],
    shareContext: payload?.shareContext ?? { shareId: '', exp: 0, sig: '' },
  });

  /**
   * Gọi API lấy dữ liệu sổ ảnh chia sẻ.
   * Nếu nhận 401, chuyển sang màn hình yêu cầu đăng nhập thay vì hiện lỗi.
   */
  const fetchSharedClass = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!id || !exp || !sig) {
      setError('Link chia sẻ thiếu tham số bắt buộc.');
      setLoading(false);
      return;
    }

    try {
      const data = await classService.getSharedClass({ id, exp, sig });
      setPayload(data);
      setRequiresLogin(false);
    } catch (fetchError: any) {
      const mapped = mapPublicError(fetchError);
      if (mapped === 'LOGIN_REQUIRED') {
        setRequiresLogin(true);
      } else {
        setError(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [id, exp, sig]);

  useEffect(() => {
    fetchSharedClass();
  }, [fetchSharedClass]);

  // Khi user vừa đăng nhập (isAuthenticated thay đổi true), re-fetch tự động.
  // api instance đã gắn Bearer token nên backend sẽ cho phép nếu requireLogin=true.
  useEffect(() => {
    if (isAuthenticated && requiresLogin) {
      fetchSharedClass();
    }
  }, [isAuthenticated, requiresLogin, fetchSharedClass]);

  // Sau khi fetch xong và canTakeAttendance=true, hydrate dữ liệu điểm danh đã có
  useEffect(() => {
    if (payload?.canTakeAttendance && payload?.shareContext && payload?.classInfo?.id) {
      sharedAttendance.hydrateFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.classInfo?.id, payload?.canTakeAttendance]);

  // Auto-close AI scanner khi thoát chế độ điểm danh
  useEffect(() => {
    if (!sharedAttendance.isAttendanceMode) {
      setAiModeOpen(false);
    }
  }, [sharedAttendance.isAttendanceMode]);

  const rosterMeta = useMemo(() => buildRosterMeta(payload?.classInfo as any, payload?.students || []), [payload]);
  
  const filteredStudents = useRosterFilteredStudents({
    students: payload?.students || [],
    attendanceSearch: sharedAttendance.attendanceSearch,
    isAttendanceMode: sharedAttendance.isAttendanceMode,
    attendanceFilter: sharedAttendance.attendanceFilter,
    savedAttendance: sharedAttendance.savedAttendance,
  });

  const { photosPerRow } = usePagination(filteredStudents, layout);

  useEffect(() => {
    const nextLayout = getInitialLayout(searchParams);
    setLayout((currentLayout) => (currentLayout === nextLayout ? currentLayout : nextLayout));
  }, [searchParams]);

  useEffect(() => {
    document.body.setAttribute('data-layout', String(layout));

    return () => {
      document.body.removeAttribute('data-layout');
    };
  }, [layout]);

  const handleLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = Number(event.target.value);
    const nextLayout = AVAILABLE_LAYOUTS.includes(next as (typeof AVAILABLE_LAYOUTS)[number])
      ? (next as (typeof AVAILABLE_LAYOUTS)[number])
      : 5;

    setLayout(nextLayout);

    const params = new URLSearchParams(searchParams);
    params.set('layout', String(nextLayout));
    setSearchParams(params, { replace: true });
  };

  const printMeta = useMemo(() => buildPrintMeta(payload?.classInfo as any, payload?.students || []), [payload]);

  const {
    isModalOpen: isPrintHeaderModalOpen,
    activeConfig: printHeaderConfig,
    draftConfig: draftPrintHeaderConfig,
    errorMessage: printHeaderError,
    openModal: openPrintHeaderModal,
    closeModal: closePrintHeaderModal,
    updateDraftConfig,
    uploadImage,
    clearDraftImage,
    applyDraftConfig,
  } = usePrintHeaderController(printMeta);

  const handleOpenPrintModal = () => openPrintHeaderModal();

  const handleApplyHeaderAndPrint = () => {
    applyDraftConfig();
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  const headerRef = useRef<HTMLDivElement>(null);

  // Build chi tiết điểm danh cho modal (dùng students từ payload)
  const detailRows = useMemo(() => {
    if (!canTakeAttendance || !sharedAttendance.savedAttendance) return [];

    const studentList = (payload?.students ?? []).map((s) => ({
      mssv: s.mssv,
      name: s.fullName || s.name,
      photoUrl: s.photoUrl,
      fullName: s.fullName,
    }));

    return buildAttendanceDetailRows(studentList as any, sharedAttendance.savedAttendance);
  }, [canTakeAttendance, payload?.students, sharedAttendance.savedAttendance]);

  // Dữ liệu sinh viên theo đúng shape mà FaceVerificationScanner cần
  const studentsForScanner = useMemo(() => {
    if (!payload?.students) return [];
    return payload.students
      .filter((s) => Boolean(s.studentId))
      .map((s) => ({
        id: s.studentId as string,
        mssv: s.mssv,
        fullName: s.fullName || s.name || s.mssv,
        photoUrl: s.photoUrl || '',
        classCode: '',       // Không có classCode riêng trong shared view
      }));
  }, [payload?.students]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="state-panel">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p>Đang tải dữ liệu sổ ảnh được chia sẻ...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-danger" role="alert">
          <strong>Lỗi!</strong> {error}
        </div>
      );
    }

    if (payload) {
      return (
        <>
          <div className="sticky-controls no-print" ref={headerRef}>
            <ShellHeader
              activeView="roster"
              selectedClassExists={true}
              hasStudents={payload.students.length > 0}
              hasSavedAttendance={Boolean(sharedAttendance.savedAttendance)}
              rosterMeta={rosterMeta}
              isAttendanceMode={sharedAttendance.isAttendanceMode}
              isAttendanceBusy={sharedAttendance.isBusy}
              isAutoCallEnabled={sharedAttendance.isAutoCallEnabled}
              onStartAttendance={sharedAttendance.handleStartAttendance}
              onSaveAttendance={() => sharedAttendance.setStatsModalOpen(true)}
              onCancelAttendance={sharedAttendance.handleCancelAttendanceMode}
              onStartAiScanner={canTakeAttendance ? () => setAiModeOpen(true) : undefined}
              onToggleAutoCall={canTakeAttendance ? sharedAttendance.setAutoCallEnabled : undefined}
              hideShareAction={true}
              hideAttendanceAction={!canTakeAttendance}
            />

            <div className="roster-controls-combined">
              <WorkspaceToolbar
                selectedClass={payload.classInfo as any}
                studentsCount={filteredStudents.length}
                photosPerRow={photosPerRow}
                loading={loading}
                searchQuery={sharedAttendance.attendanceSearch}
                onLayoutChange={handleLayoutChange}
                onSearchChange={(event) => sharedAttendance.setAttendanceSearch(event.target.value)}
                onPrint={handleOpenPrintModal}
              />

              {!sharedAttendance.isAttendanceMode && sharedAttendance.savedAttendance && (
                <div className="attendance-summary-panel">
                  <div className="attendance-summary-row">
                    <div className="attendance-summary-meta">
                      Đã điểm danh lúc: <strong>{new Date(sharedAttendance.savedAttendance.takenAt).toLocaleString('vi-VN')}</strong>
                    </div>

                    <div className="attendance-summary-stats">
                      <span>
                        Có mặt: <strong className="text-success">{sharedAttendance.savedAttendance.stats.present}</strong>
                      </span>
                      <span>
                        Vắng: <strong className="text-danger">{sharedAttendance.savedAttendance.stats.absent}</strong>
                      </span>
                      <span>
                        Tỉ lệ: <strong>{sharedAttendance.savedAttendance.stats.total > 0 ? Math.round((sharedAttendance.savedAttendance.stats.present / sharedAttendance.savedAttendance.stats.total) * 100) : 0}%</strong>
                      </span>
                    </div>

                    {canTakeAttendance && (
                      <div className="attendance-summary-filter">
                        <select
                          className="form-select"
                          value={sharedAttendance.attendanceFilter}
                          onChange={(event) => sharedAttendance.setAttendanceFilter(event.target.value as AttendanceFilter)}
                          aria-label="Lọc danh sách điểm danh"
                        >
                          <option value="all">Tất cả</option>
                          <option value="present">Có mặt</option>
                          <option value="absent">Vắng</option>
                        </select>
                      </div>
                    )}

                    {canTakeAttendance && (
                      <div className="attendance-summary-actions">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => sharedAttendance.setRetakeConfirmOpen(true)}>
                          Điểm danh lại
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => sharedAttendance.setDetailModalOpen(true)}>
                          Xem chi tiết
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <RosterBody
            loading={loading}
            error={error}
            students={filteredStudents}
            printMeta={printMeta}
            printHeaderConfig={printHeaderConfig}
            isAttendanceMode={sharedAttendance.isAttendanceMode}
            attendanceByMssv={sharedAttendance.activeAttendanceMap}
            onToggleAttendance={sharedAttendance.handleToggleAttendance}
          />
        </>
      );
    }
    
    return null;
  };

  return (
    <div className="shared-page">
      {!loading && requiresLogin ? (
        <div className="shared-login-required">
          <div className="shared-login-card">
            <h2 className="shared-login-title">Yêu cầu đăng nhập</h2>
            <p className="shared-login-desc">
              Sổ ảnh này chỉ dành cho tài khoản HUST. Vui lòng đăng nhập để xem.
            </p>

            {!isLoginOpen ? (
              <button
                type="button"
                className="btn btn-primary shared-login-btn"
                onClick={() => setIsLoginOpen(true)}
              >
                Đăng nhập bằng tài khoản HUST
              </button>
            ) : (
              <form className="shared-login-form" onSubmit={async (e) => {
                e.preventDefault();
                setLoginError(null);
            
                const isValidHustEmail = /.+@hust\.edu\.vn$/i.test(loginEmail);
                if (!isValidHustEmail) {
                  setLoginError('Vui lòng dùng email HUST có định dạng @hust.edu.vn.');
                  return;
                }
            
                if (loginPassword.length < 6) {
                  setLoginError('Mật khẩu cần có ít nhất 6 ký tự.');
                  return;
                }
            
                setLoginSubmitting(true);
            
                try {
                  await login({ email: loginEmail, password: loginPassword });
                  setIsLoginOpen(false);
                  setLoginEmail('');
                  setLoginPassword('');
                } catch (err: any) {
                  const status = err?.response?.status;
                  if (status === 401) {
                    setLoginError('Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.');
                  } else if (!err?.response) {
                    setLoginError('Không thể kết nối tới server. Vui lòng thử lại sau.');
                  } else {
                    setLoginError('Đăng nhập thất bại. Vui lòng thử lại.');
                  }
                } finally {
                  setLoginSubmitting(false);
                }
              }} noValidate>
                <div className="shared-login-field">
                  <label htmlFor="shared-email" className="form-label">Email HUST</label>
                  <input
                    id="shared-email"
                    type="email"
                    className="form-control"
                    placeholder="name@hust.edu.vn"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loginSubmitting}
                    autoComplete="email"
                  />
                </div>
                <div className="shared-login-field">
                  <label htmlFor="shared-password" className="form-label">Mật khẩu</label>
                  <input
                    id="shared-password"
                    type="password"
                    className="form-control"
                    placeholder="Mật khẩu"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loginSubmitting}
                    autoComplete="current-password"
                  />
                </div>
                {loginError && (
                  <div className="alert alert-danger" role="alert">{loginError}</div>
                )}
                <div className="shared-login-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loginSubmitting}
                  >
                    {loginSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setIsLoginOpen(false); setLoginError(null); }}
                    disabled={loginSubmitting}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        renderContent()
      )}

      {/* Modals điểm danh – chỉ mount khi có quyền */}
      {canTakeAttendance && (
        <>
          {/* AI Face Scanner – render qua Portal, chia sẻ đúng hàm toggle như owner */}
          {sharedAttendance.isAttendanceMode && isAiModeOpen && (
            <FaceVerificationScanner
              students={studentsForScanner}
              activeAttendanceMap={sharedAttendance.activeAttendanceMap}
              onToggleAttendance={sharedAttendance.handleToggleAttendance}
              onClose={() => setAiModeOpen(false)}
              classId={payload?.classInfo?.id ?? ''}
              shareToken={payload?.shareContext ?? undefined}
              isAutoCallEnabled={sharedAttendance.isAutoCallEnabled}
              onToggleAutoCall={sharedAttendance.setAutoCallEnabled}
            />
          )}

          {/* Thanh gọi tên thủ công cho giám thị */}
          {sharedAttendance.isAttendanceMode && !isAiModeOpen && sharedAttendance.isAutoCallEnabled && (
            <ManualCallingBar
              students={payload?.students?.map((s) => ({ id: s.mssv, mssv: s.mssv, fullName: s.fullName || s.name || s.mssv })) ?? []}
              callingIndex={sharedAttendance.callingIndex}
              presentCount={Object.values(sharedAttendance.activeAttendanceMap).filter((r) => r.status === 'present').length}
              onMarkPresent={sharedAttendance.handleCallingMarkPresent}
              onSkip={sharedAttendance.handleCallingNext}
              onClose={sharedAttendance.handleCallingClose}
              isAutoCallEnabled={sharedAttendance.isAutoCallEnabled}
            />
          )}

          <AttendanceStatsModal
            isOpen={sharedAttendance.isStatsModalOpen}
            present={sharedAttendance.attendanceStats.present}
            absent={sharedAttendance.attendanceStats.absent}
            total={sharedAttendance.attendanceStats.total}
            onCancel={() => sharedAttendance.setStatsModalOpen(false)}
            onConfirm={sharedAttendance.handleConfirmSaveAttendance}
            isSubmitting={sharedAttendance.isBusy}
          />

          <AttendanceDetailModal
            isOpen={sharedAttendance.isDetailModalOpen}
            rows={detailRows}
            classLabel={rosterMeta.classCodeLabel}
            onClose={() => sharedAttendance.setDetailModalOpen(false)}
          />

          <RetakeConfirmModal
            isOpen={sharedAttendance.isRetakeConfirmOpen}
            onCancel={() => sharedAttendance.setRetakeConfirmOpen(false)}
            onConfirm={sharedAttendance.handleConfirmRetakeAttendance}
            isSubmitting={sharedAttendance.isBusy}
          />
        </>
      )}

      {sharedAttendance.message && (
        <AppToast message={sharedAttendance.message} onClose={() => sharedAttendance.setMessage(null)} className="no-print" />
      )}

      <PrintHeaderModal
        isOpen={isPrintHeaderModalOpen}
        draftConfig={draftPrintHeaderConfig}
        printMeta={printMeta}
        errorMessage={printHeaderError}
        onClose={closePrintHeaderModal}
        onApplyAndPrint={handleApplyHeaderAndPrint}
        onUpdateDraft={updateDraftConfig}
        onUploadImage={uploadImage}
        onClearImage={clearDraftImage}
      />
    </div>
  );
}

export default SharedClassPage;
