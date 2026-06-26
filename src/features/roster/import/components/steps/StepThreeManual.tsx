import React from 'react';
import { ImportStateSnapshot } from '../../types';
import { ImportProgress } from './ImportProgress';

/**
 * Bước 3: Cho phép người dùng tự cấu hình (chỉ định thủ công) cột nào tương ứng với MSSV và Họ tên.
 * Cũng cho phép chọn dòng bắt đầu đọc dữ liệu (để bỏ qua các dòng tiêu đề rác).
 * 
 * @param props.state Trạng thái hiện tại của quá trình import.
 * @param props.onClose Callback để đóng modal (khi đã import thành công).
 * @param props.onBack Callback để quay lại bước trước đó.
 * @param props.onSubmitManual Callback để xác nhận cấu hình cột thủ công và tiếp tục.
 * @param props.onManualMssvChange Callback cập nhật tên cột được chọn làm cột MSSV.
 * @param props.onManualNameChange Callback cập nhật tên cột được chọn làm cột Họ tên.
 * @param props.onStartRowChange Callback cập nhật dòng bắt đầu lấy dữ liệu.
 * @param props.onExportPDF Callback xuất PDF danh sách thí sinh (chỉ hiển thị khi import thành công).
 * @returns React Element giao diện bước 3.
 */
export function StepThree(props: {
  state: ImportStateSnapshot;
  onClose: () => void;
  onBack: () => void;
  onSubmitManual: () => Promise<void>;
  onManualMssvChange: (value: string) => void;
  onManualNameChange: (value: string) => void;
  onStartRowChange: (value: number) => void;
  onExportPDF?: () => void;
  isExportingPDF?: boolean;
}) {
  const { state } = props;
  const isLoading = state.isImporting || state.isPreviewLoading;

  if (state.stepThreeMode === 'success') {
    const classCount = state.lastImportedClassIds?.length ?? 0;
    return (
      <>
        <p className="import-modal-subtitle">Hoàn tất import</p>
        <ImportProgress step={state.step} />
        <div className="import-detection-box is-success"><div><strong>Import thành công</strong><p>{state.message?.text || 'Dữ liệu đã được import thành công.'}</p></div></div>
        <div className="import-actions import-actions-center" style={{ gap: '10px', flexWrap: 'wrap' }}>
          {props.onExportPDF && classCount > 0 && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={props.onExportPDF}
              disabled={props.isExportingPDF}
              title="Tải về file PDF danh sách thí sinh dự thi cho tất cả lớp thi"
            >
              {props.isExportingPDF ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Đang xuất PDF...</>
              ) : (
                <><i className="bi bi-file-earmark-pdf me-1" />Xuất PDF danh sách dự thi</>
              )}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={props.onClose}>Đóng</button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="import-modal-subtitle">Cấu hình cột thủ công</p>
      <ImportProgress step={state.step} />
      <h5 className="import-section-title">CHỈ ĐỊNH CỘT</h5>

      <div className="manual-field-group">
        <label htmlFor="mssv-column-select">Cột mã số sinh viên (MSSV) *</label>
        <select id="mssv-column-select" className="form-select" value={state.manualMssvColumn} onChange={(event) => props.onManualMssvChange(event.target.value)}>
          <option value="">-- Chọn cột --</option>
          {state.columns.map((column) => <option key={column} value={column}>{column}</option>)}
        </select>
      </div>

      <div className="manual-field-group">
        <label htmlFor="name-column-select">Cột họ và tên</label>
        <select id="name-column-select" className="form-select" value={state.manualNameColumn} onChange={(event) => props.onManualNameChange(event.target.value)}>
          <option value="">-- Chọn cột --</option>
          {state.columns.map((column) => <option key={column} value={column}>{column}</option>)}
        </select>
      </div>

      <div className="manual-field-group">
        <label htmlFor="start-row-select">Dữ liệu bắt đầu từ hàng</label>
        <select id="start-row-select" className="form-select" value={state.startRow} onChange={(event) => props.onStartRowChange(Number(event.target.value))}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((rowNumber) => <option key={rowNumber} value={rowNumber}>Hàng {rowNumber}</option>)}
        </select>
      </div>

      <div className="import-actions">
        <button type="button" className="btn btn-outline-secondary" onClick={props.onBack} disabled={isLoading}>Quay lại</button>
        <button type="button" className="btn btn-primary" onClick={props.onSubmitManual} disabled={!state.manualMssvColumn || !state.manualNameColumn || isLoading}>
          {isLoading ? 'Đang phân tích...' : 'Tiếp tục →'}
        </button>
      </div>
    </>
  );
}
