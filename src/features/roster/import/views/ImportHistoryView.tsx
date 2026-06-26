import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImportHistory } from '../hooks/useImportHistory';
import { actionLabel, sourceOptions, sourceTypeLabel } from '../utils/history/constants';
import { formatDateTime } from '../utils/history/utils';
import { ImportHistoryItem, ImportHistoryClassSummary } from '../../../roster/services/class.types';
import ShellHeader from '../../../../layouts/ShellHeader';
import { formatExcelTime } from '../utils/formatters';
import { useExportExamPDF } from '../hooks/useExportExamPDF';

// ─── Summary helpers ──────────────────────────────────────────────────────────

function getSourceDisplayName(item: ImportHistoryItem): string {
  const source = sourceTypeLabel[item.sourceType] || item.sourceType || '';
  const name = item.sourceName || '';
  if (!name) return source;
  return name;
}

function ActionBadge({ action }: { action?: string }) {
  const label = actionLabel[action || ''] || (action || 'Tạo mới');
  return <span style={{ fontWeight: action === 'updated' ? 600 : 400, color: '#111827' }}>{label}</span>;
}

function MappingBadge({ mode }: { mode?: string | null }) {
  if (!mode) return <span>—</span>;
  return (
    <span style={{ color: '#111827' }}>
      {mode === 'auto' ? 'Tự động' : 'Thủ công'}
    </span>
  );
}

// ─── Expanded detail rows ─────────────────────────────────────────────────────

function ExamSessionRows({ classes, onOpenClass }: { classes: ImportHistoryClassSummary[]; onOpenClass: (id: string) => void }) {
  if (!classes || classes.length === 0) {
    return (
      <tr>
        <td colSpan={10} className="ps-5 py-2" style={{ color: '#111827' }}>
          Không có thông tin lớp thi liên kết.
        </td>
      </tr>
    );
  }
  return (
    <>
      {classes.map((cls) => (
        <tr key={cls.id} className="history-subrow">
          <td className="ps-5">
            <button
              type="button"
              className="history-class-link"
              onClick={() => onOpenClass(cls.id)}
              style={{ color: '#111827', fontWeight: 600, border: 'none', background: 'none', padding: 0 }}
            >
              {cls.classExamCode || '—'}
            </button>
          </td>
          <td colSpan={2}>
            <div style={{ color: '#111827' }}>{cls.courseCode} – {cls.courseName}</div>
            <div style={{ color: '#111827' }}>{cls.semester && `HK ${cls.semester}`}</div>
          </td>
          <td style={{ color: '#111827' }}>{cls.examDate || '—'}</td>
          <td style={{ color: '#111827' }}>{cls.examRoom || '—'}</td>
          <td style={{ color: '#111827' }}>
            {formatExcelTime(cls.examTime) || cls.examShift || '—'}
          </td>
          <td colSpan={4} />
        </tr>
      ))}
    </>
  );
}



// ─── Delete Confirm Popup ─────────────────────────────────────────────────────

function DeleteConfirmPopup({
  item,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  item: ImportHistoryItem;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const classCount = item.classes?.length ?? item.classIds?.length ?? 0;
  return (
    <div className="import-modal-backdrop" role="presentation" onClick={isDeleting ? undefined : onCancel}>
      <div className="import-modal-card" role="dialog" aria-modal="true" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.2rem' }}>⚠ Xác nhận xóa</h2>
        <p className="mt-2 mb-1">Bạn sắp xóa bản ghi import:</p>
        <div className="import-detection-box is-warning mb-3">
          <div>
            <strong>{getSourceDisplayName(item)}</strong>
            <p className="mb-0 mt-1">{formatDateTime(String(item.createdAt))}</p>
          </div>
        </div>
        {classCount > 0 && (
          <p className="text-danger mb-3" style={{ fontSize: '0.9rem' }}>
            <strong>Cảnh báo:</strong> Thao tác này sẽ xóa vĩnh viễn <strong>{classCount} lớp thi</strong> liên kết và toàn bộ danh sách sinh viên trong các lớp đó.
          </p>
        )}
        <div className="import-actions">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isDeleting}>Hủy</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Đang xóa...</> : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

function ImportHistoryView() {
  const navigate = useNavigate();
  const {
    historyItems,
    pagination,
    page,
    sourceType,
    loading,
    error,
    setPage,
    setSourceType,
    refetch,
    deleteHistory,
  } = useImportHistory();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ImportHistoryItem | null>(null);
  const { isExporting: isExportingPDF, exportPDF } = useExportExamPDF();
  const [exportingHistoryId, setExportingHistoryId] = useState<string | null>(null);

  const totalPages = Math.max(pagination.totalPages || 0, 1);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenClass = (classId: string) => {
    if (classId) navigate(`/classes/${classId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteItem) return;
    setDeletingId(pendingDeleteItem.id);
    try {
      await deleteHistory(pendingDeleteItem.id);
      setPendingDeleteItem(null);
    } catch {
      // Error handled by hook
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportPDF = async (item: ImportHistoryItem) => {
    const classIds = item.classes?.map(c => c.id) ?? item.classIds ?? [];
    if (classIds.length === 0) return;
    setExportingHistoryId(item.id);
    try {
      const fileName = `DanhSachDuThi_${item.sourceName?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'import'}.pdf`;
      await exportPDF(classIds, fileName);
    } finally {
      setExportingHistoryId(null);
    }
  };

  return (
    <>
      <div className="sticky-controls no-print">
        <ShellHeader activeView="history" />
      </div>
      <section className="history-panel">
        <div className="history-toolbar">
          <div className="history-filter-group">
            <select
              id="history-source-type"
              className="form-select"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as 'all' | 'excel' | 'google_sheet')}
              disabled={loading}
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="state-panel">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p>Đang tải lịch sử import...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-danger" role="alert">
            <strong>Lỗi!</strong> {error}
            <div className="mt-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={refetch}>Thử lại</button>
            </div>
          </div>
        )}

        {!loading && !error && historyItems.length === 0 && (
          <div className="empty-state-card">
            <h2>Chưa có lịch sử import</h2>
            <p>Hiện chưa có dữ liệu import phù hợp với bộ lọc đã chọn.</p>
          </div>
        )}

        {!loading && !error && historyItems.length > 0 && (
          <>
            <div className="table-responsive history-table-wrap">
              <table className="table table-bordered table-hover align-middle history-table mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}></th>
                    <th>Tên file (Nguồn)</th>
                    <th>Tóm tắt</th>
                    <th>Hành động</th>
                    <th>Trùng lớp</th>
                    <th>Thay đổi</th>
                    <th>Tổng dòng</th>
                    <th>Import</th>
                    <th>Bỏ qua</th>
                    <th>Mapping</th>
                    <th>Thời gian</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((item) => {
                    const isExpanded = expandedIds.has(item.id);
                    const classCount = item.classes?.length ?? item.classIds?.length ?? 0;
                    const studentTotal = item.importedRows ?? 0;
                    const summary = classCount > 0
                      ? `${classCount} lớp thi, ${studentTotal} SV`
                      : `${studentTotal} sinh viên`;

                    return (
                      <React.Fragment key={item.id}>
                        <tr className={isExpanded ? 'table-active' : ''}>
                          {/* Expand toggle */}
                          <td className="text-center p-0" style={{ width: '28px' }}>
                            {classCount > 0 && (
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 m-0"
                                onClick={() => toggleExpand(item.id)}
                                aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                                style={{ color: '#6b7280', fontSize: '0.85rem' }}
                              >
                                {isExpanded ? '▾' : '▸'}
                              </button>
                            )}
                          </td>

                          {/* Tên file */}
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ color: '#111827' }}>
                              <div>
                                <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{getSourceDisplayName(item)}</div>
                                <div style={{ color: '#111827' }}>{sourceTypeLabel[item.sourceType] || item.sourceType}</div>
                              </div>
                            </div>
                          </td>

                          {/* Tóm tắt */}
                          <td>
                            <span style={{ color: '#111827' }}>{summary}</span>
                          </td>

                          {/* Hành động */}
                          <td><ActionBadge action={item.action} /></td>

                          {/* Trùng lớp */}
                          <td>
                            <span style={{ color: '#111827' }}>
                              {item.duplicateDetected ? 'Có' : 'Không'}
                            </span>
                          </td>

                          {/* Thay đổi */}
                          <td>
                            {item.changesSummary?.studentChanges ? (
                              <div className="d-flex flex-column" style={{ color: '#111827' }}>
                                {(item.changesSummary.studentChanges.added ?? 0) > 0 && <span>+{item.changesSummary.studentChanges.added} thêm</span>}
                                {(item.changesSummary.studentChanges.removed ?? 0) > 0 && <span>-{item.changesSummary.studentChanges.removed} xóa</span>}
                                {(item.changesSummary.studentChanges.renamed ?? 0) > 0 && <span>~{item.changesSummary.studentChanges.renamed} đổi</span>}
                              </div>
                            ) : <span style={{ color: '#111827' }}>—</span>}
                          </td>


                          {/* Tổng dòng */}
                          <td className="text-center" style={{ color: '#111827', fontWeight: 600 }}>{item.totalCount ?? '—'}</td>

                          {/* Import */}
                          <td className="text-center" style={{ color: '#111827', fontWeight: 600 }}>{item.importedRows ?? '—'}</td>

                          {/* Bỏ qua */}
                          <td className="text-center" style={{ color: '#111827' }}>{item.skippedRows ?? '—'}</td>

                          {/* Mapping */}
                          <td><MappingBadge mode={item.mappingModeUsed} /></td>

                          {/* Thời gian */}
                          <td style={{ color: '#111827', whiteSpace: 'nowrap' }}>{formatDateTime(String(item.createdAt))}</td>


                          <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                            {/* Xuất PDF */}
                            {(item.classes?.length ?? item.classIds?.length ?? 0) > 0 && (
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 border-0 me-2"
                                style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '13px', textDecoration: 'none' }}
                                onClick={() => handleExportPDF(item)}
                                disabled={exportingHistoryId === item.id || isExportingPDF}
                                title="Xuất PDF danh sách thí sinh dự thi"
                              >
                                {exportingHistoryId === item.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                ) : (
                                  'PDF'
                                )}
                              </button>
                            )}
                            {/* Xóa */}
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 border-0"
                              style={{ color: '#000', fontWeight: 'bold', fontSize: '15px', textDecoration: 'none' }}
                              onClick={() => setPendingDeleteItem(item)}
                              disabled={deletingId === item.id}
                              title="Xóa lịch sử và các lớp liên kết"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>

                        {/* Expanded: danh sách lớp thi */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="p-0">
                              <div className="history-expand-wrapper">
                                <table className="table table-sm mb-0 history-expand-table">
                                  <thead>
                                    <tr>
                                      <th className="ps-5">Mã lớp thi</th>
                                      <th colSpan={2}>Học phần</th>
                                      <th>Ngày thi</th>
                                      <th>Phòng thi</th>
                                      <th>Giờ/Kíp</th>
                                      <th colSpan={4} />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <ExamSessionRows classes={item.classes ?? []} onOpenClass={handleOpenClass} />
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="history-pagination">
              <span className="history-total">Tổng: {pagination.total} bản ghi</span>
              <div className="btn-group" role="group" aria-label="Phân trang lịch sử import">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setPage(page - 1)} disabled={page <= 1}>Trước</button>
                <button type="button" className="btn btn-outline-secondary" disabled>Trang {page}/{totalPages}</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Sau</button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Delete confirmation popup */}
      {pendingDeleteItem && (
        <DeleteConfirmPopup
          item={pendingDeleteItem}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDeleteItem(null)}
          isDeleting={deletingId === pendingDeleteItem.id}
        />
      )}
    </>
  );
}

export default ImportHistoryView;
