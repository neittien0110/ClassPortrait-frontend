import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClasses } from '../hooks/useClasses';
import ShellHeader from '../../../layouts/ShellHeader';
import { Class } from '../../../types/Class';
import { formatDate, formatTime } from '../utils/roster.utils';
import { useExportExamPDF } from '../import/hooks/useExportExamPDF';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GROUP_OPTIONS = [
  { value: 'courseCode', label: 'Theo mã học phần' },
  { value: 'examDate', label: 'Theo ngày thi' },
] as const;

type GroupBy = typeof GROUP_OPTIONS[number]['value'];


function getGroupKey(cls: Class, groupBy: GroupBy): string {
  if (groupBy === 'courseCode') return cls.courseCode ? `${cls.courseCode}${cls.courseName ? ' – ' + cls.courseName : ''}` : '(Chưa có mã HP)';
  if (groupBy === 'examDate') return cls.examDate ? formatDate(cls.examDate) : '(Chưa có ngày thi)';
  return '';
}

function groupClasses(classes: Class[], groupBy: GroupBy): Map<string, Class[]> {
  const map = new Map<string, Class[]>();
  for (const cls of classes) {
    const key = getGroupKey(cls, groupBy);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(cls);
  }
  return map;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClassListView() {
  const navigate = useNavigate();
  const { classes, loading, error, refetchClasses } = useClasses({ enabled: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('courseCode');
  const { isExporting: isExportingPDF, exportPDF } = useExportExamPDF();
  const [exportingGroupKey, setExportingGroupKey] = useState<string | null>(null);

  const handleExportGroupPDF = async (groupKey: string, items: Class[]) => {
    const classIds = items.map(c => c.id).filter(Boolean);
    if (classIds.length === 0) return;
    setExportingGroupKey(groupKey);
    try {
      const firstName = items[0];
      const fileName = `DanhSachDuThi_${(firstName?.courseCode ?? 'HP').replace(/[^a-zA-Z0-9]/g, '_')}_HK${(firstName?.semester ?? '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await exportPDF(classIds, fileName);
    } finally {
      setExportingGroupKey(null);
    }
  };

  // Filter theo search
  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((cls) => {
      const haystack = [
        cls.courseCode, cls.courseName, cls.classExamCode,
        cls.semester, cls.examRoom, cls.instructor, cls.department,
        ...(cls.classCodes ?? []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [classes, searchQuery]);

  // Group
  const grouped = useMemo(() => groupClasses(filteredClasses, groupBy), [filteredClasses, groupBy]);

  const handleRowClick = (classId: string) => navigate(`/classes/${classId}`);

  return (
    <>
      <div className="sticky-controls no-print">
        <ShellHeader activeView="class-list" onImportSuccess={() => refetchClasses()} />
      </div>

      <div className="container-fluid py-3" style={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 72px)' }}>

        {/* Toolbar: search + group */}
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          {/* Search */}
          <div className="position-relative flex-grow-1" style={{ maxWidth: '360px' }}>
            <input
              type="text"
              className="form-control ps-4"
              placeholder="Tìm theo mã HP, tên môn, mã lớp thi, phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px' }}
            />
          </div>

          {/* Group by */}
          <div style={{ minWidth: '220px' }}>
            <select
              className="form-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <span className="text-muted ms-auto" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            {filteredClasses.length} lớp thi
          </span>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-center mt-5"><div className="spinner-border text-primary" role="status" /></div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center text-muted my-5">
            {searchQuery ? (
              <>
                <h5>Không tìm thấy lớp thi phù hợp</h5>
                <p>Thử từ khóa khác hoặc <button className="btn btn-link p-0" onClick={() => setSearchQuery('')}>xóa bộ lọc</button>.</p>
              </>
            ) : (
              <>
                <h5>Chưa có dữ liệu lớp thi</h5>
                <p>Vui lòng import danh sách bằng nút "Import File" phía trên.</p>
              </>
            )}
          </div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {Array.from(grouped.entries()).map(([groupKey, items]) => (
              <div key={groupKey} className="bg-white rounded shadow-sm border overflow-hidden">
                {/* Group header */}
                <div className="px-4 py-2 border-bottom d-flex align-items-center gap-2"
                  style={{ background: '#f1f5f9' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#1e40af' }}>{groupKey}</strong>
                  <span className="badge bg-secondary rounded-pill ms-1" style={{ fontSize: '0.75rem' }}>{items.length}</span>
                  <button
                    type="button"
                    className="btn btn-sm ms-auto d-flex align-items-center gap-1"
                    style={{
                      fontSize: '0.78rem', padding: '2px 10px',
                      background: '#e0e7ff', color: '#1e40af',
                      border: '1px solid #c7d2fe', borderRadius: '6px', fontWeight: 600,
                    }}
                    onClick={(e) => { e.stopPropagation(); handleExportGroupPDF(groupKey, items); }}
                    disabled={exportingGroupKey === groupKey || isExportingPDF}
                    title={`Xuất PDF danh sách thí sinh dự thi cho ${items.length} lớp thi`}
                  >
                    {exportingGroupKey === groupKey ? (
                      <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }} />&nbsp;Đang xuất...</>
                    ) : (
                      <><i className="bi bi-file-earmark-pdf" />&#160;Xuất PDF</>
                    )}
                  </button>
                </div>

                {/* Table */}
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle" style={{ fontSize: '0.875rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th className="text-center">Học kỳ</th>
                        <th>Mã HP</th>
                        <th>Môn học</th>
                        <th>Mã lớp học</th>
                        <th className="text-center">Mã lớp thi</th>
                        <th className="text-center">Ngày thi</th>
                        <th className="text-center">Phòng thi</th>
                        <th className="text-center">Giờ thi</th>
                        <th className="text-center">Kíp thi</th>
                        <th>GV giảng dạy</th>
                        <th className="text-center">Sĩ số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((cls) => {
                        const classCodes = cls.classCodes && cls.classCodes.length > 0
                          ? cls.classCodes
                          : cls.classCode ? [cls.classCode] : [];
                        const examShift = cls.examShift ?? cls.shift;

                        return (
                          <tr
                            key={cls.id}
                            onClick={() => handleRowClick(cls.id)}
                            style={{ cursor: 'pointer' }}
                            className="class-list-row"
                          >
                            <td className="text-center">{cls.semester || '—'}</td>
                            <td className="fw-medium text-primary">{cls.courseCode || '—'}</td>
                            <td style={{ maxWidth: '240px' }}>{cls.courseName || '—'}</td>
                            <td>
                              {classCodes.length === 0
                                ? <span className="text-muted">—</span>
                                : <span>{classCodes.join(', ')}</span>
                              }
                            </td>

                            <td className="text-center">{cls.classExamCode || '—'}</td>
                            <td className="text-center">{formatDate(cls.examDate)}</td>
                            <td className="text-center">{cls.examRoom || '—'}</td>
                            <td className="text-center font-monospace">{formatTime(cls.examTime)}</td>
                            <td className="text-center">{examShift || '—'}</td>
                            <td style={{ maxWidth: '180px' }}>
                              <span className="text-truncate d-block" title={cls.instructor}>{cls.instructor || '—'}</span>
                            </td>
                            <td className="text-center fw-semibold">{cls.studentCount ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
