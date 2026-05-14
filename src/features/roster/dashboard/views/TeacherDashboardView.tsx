import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTeacherDashboard from '../hooks/useTeacherDashboard';
import { formatGeneratedAt } from '../utils/dashboardHelpers';
import DashboardSummaryGrid from '../components/DashboardSummaryGrid';
import UpcomingExamsList from '../components/UpcomingExamsList';
import { PhotoHealthChart, ExamRoomChart, ExamShiftChart, CourseDistributionChart } from '../components/DashboardCharts';
import AttendanceOverviewCard from '../components/AttendanceOverviewCard';
import ShareLinkStatusCard from '../components/ShareLinkStatusCard';
import RoomShiftMatrix from '../components/RoomShiftMatrix';
import RoomGanttChart from '../components/RoomGanttChart';
import DashboardFilters from '../components/DashboardFilters';
import ExamCalendar from '../components/ExamCalendar';
import ShellHeader from '../../../../layouts/ShellHeader';

// ─────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────

interface DashSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

/**
 * Wrapper nhất quán cho từng phân vùng của Dashboard.
 * @param props Tiêu đề, mô tả và nội dung phân vùng.
 * @returns JSX phân vùng dashboard.
 */
function DashSection({ title, subtitle, children, className = '', headerAction }: DashSectionProps) {
  return (
    <section className={`dash-section ${className}`}>
      <div className="dash-section-header d-flex justify-content-between align-items-center">
        <div>
          <h2 className="dash-section-title">{title}</h2>
          {subtitle && <p className="dash-section-subtitle">{subtitle}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Wrapper cho từng panel con (chart, card).
 * @param props Tiêu đề và nội dung panel.
 * @returns JSX panel.
 */
function DashPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dash-panel">
      <h3 className="dash-panel-title">{title}</h3>
      <div className="dash-panel-body">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN VIEW
// ─────────────────────────────────────────────

function TeacherDashboardView() {
  const navigate = useNavigate();
  const {
    overview,
    photoHealth,
    allExams,
    logistics,
    attendance,
    shareLinks,
    generatedAt,
    loading,
    error,
    refetch,
    selectedDate,
    setSelectedDate,
    availableDates,
    filters,
    setFilters,
  } = useTeacherDashboard();

  const isInitialLoading = loading && !generatedAt;

  const handleOpenClass = (classId: string) => {
    navigate(`/classes/${classId}`);
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <>
        <div className="sticky-controls no-print">
          <ShellHeader activeView="dashboard" />
        </div>
        <div className="dash-page">
          <div className="dash-loading-state">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p>Đang tải dữ liệu dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <div className="sticky-controls no-print">
          <ShellHeader activeView="dashboard" />
        </div>
        <div className="dash-page">
          <div className="alert alert-danger d-flex align-items-center gap-3" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Lỗi tải dữ liệu!</strong> {error}
              <div className="mt-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={refetch}>
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <>
      <div className="sticky-controls no-print">
        <ShellHeader activeView="dashboard" />
      </div>

      <div className="dash-page">
        {/* ── TOP SECTION: Thông tin tức thời (Không lọc) ────────── */}

        {/* 1. Lịch thi sắp tới */}
        <DashSection
          title="Lịch thi sắp tới"
          subtitle="Danh sách các lớp thi sắp tới, kèm tỷ lệ ảnh và điểm danh. Bấm vào để mở sổ ảnh lớp."
        >
          {loading && <div className="dash-refresh-note">Đang cập nhật...</div>}
          <UpcomingExamsList exams={allExams.filter(e => e.examDate >= new Date().toISOString().split('T')[0])} onOpenClass={handleOpenClass} />
        </DashSection>


        {/* 2. Tình hình sử dụng phòng thi */}
        <DashSection
          title="Tình hình sử dụng phòng thi"
          subtitle="Theo dõi phân bổ phòng thi và ca thi theo ngày thi."
          headerAction={
            <div className="d-flex align-items-center gap-3">
              <span className="small text-muted fw-semibold">Chọn ngày thi:</span>
              <ExamCalendar
                selectedDate={selectedDate}
                availableDates={availableDates}
                onDateSelect={setSelectedDate}
              />
            </div>
          }
        >
          <div className="row g-4">
            <div className="col-12">
              <DashPanel title="Ma trận Phòng thi & Ca thi">
                <RoomShiftMatrix exams={allExams} selectedDate={selectedDate} />
              </DashPanel>
            </div>
            <div className="col-12">
              <DashPanel title="Sơ đồ Gantt sử dụng phòng">
                <RoomGanttChart exams={allExams} selectedDate={selectedDate} />
              </DashPanel>
            </div>
          </div>
        </DashSection>

        <hr className="my-5" />

        {/* ── MIDDLE SECTION: Bộ lọc báo cáo ─────────────────────── */}
        <div className="dash-section-header mb-4">
          <h2 className="dash-section-title">Giám sát & Điều phối kỳ thi</h2>
          <p className="dash-section-subtitle">Dữ liệu được tổng hợp dựa trên khoảng thời gian lựa chọn.</p>
        </div>

        <DashboardFilters
          startDate={filters.startDate}
          endDate={filters.endDate}
          onFilterChange={(newFilters) => setFilters(newFilters)}
        />

        {/* 3. KPI Tổng quan */}
        <DashSection
          title="Tổng quan nhanh"
          subtitle="Bức tranh toàn cảnh kỳ thi: số lớp, sinh viên, phòng thi, ca thi và tình trạng ảnh."
        >
          <DashboardSummaryGrid
            overview={overview}
            validPhotoRate={photoHealth.validPhotoRate}
            classesWithIncompletePhoto={photoHealth.classesWithIncompletePhoto}
          />
        </DashSection>

        {/* 4. Thống kê chi tiết */}
        <DashSection
          title="Thống kê chi tiết"
          subtitle="Phân bổ sinh viên theo phòng thi, ca thi và học phần."
          className="dash-section-charts"
        >
          <div className="dash-charts-grid">
            <DashPanel title="Sinh viên theo phòng thi">
              <ExamRoomChart byRoom={logistics.byRoom} />
            </DashPanel>

            <DashPanel title="Phân bổ theo ca thi">
              <ExamShiftChart byShift={logistics.byShift} />
            </DashPanel>

            <DashPanel title="Sinh viên theo học phần">
              <CourseDistributionChart byCourse={logistics.byCourse} />
            </DashPanel>

            <DashPanel title="Tình trạng ảnh sinh viên">
              <PhotoHealthChart photoHealth={photoHealth} />
              {photoHealth.classesWithIncompletePhoto > 0 && (
                <p className="dash-photo-warning">
                  ⚠️ Còn <strong>{photoHealth.classesWithIncompletePhoto} lớp</strong> chưa đủ ảnh hợp lệ.
                </p>
              )}
            </DashPanel>
          </div>
        </DashSection>

        {/* ── SECTION 4: Điểm danh & Share Links ──────────────────── */}
        <DashSection
          title="Điểm danh & Chia sẻ"
          subtitle="Tổng quan tình trạng điểm danh thí sinh và link chia sẻ sổ ảnh."
        >
          <div className="dash-bottom-grid">
            <DashPanel title="Điểm danh thí sinh">
              <AttendanceOverviewCard attendance={attendance} />
            </DashPanel>
            <DashPanel title="Link chia sẻ sổ ảnh">
              <ShareLinkStatusCard shareLinks={shareLinks} />
            </DashPanel>
          </div>
        </DashSection>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="dash-footer">
          Dữ liệu cập nhật lúc: {formatGeneratedAt(generatedAt)}
          <button type="button" className="btn btn-link btn-sm p-0 ms-3" onClick={refetch}>
            🔄 Làm mới
          </button>
        </div>
      </div>
    </>
  );
}

export default TeacherDashboardView;
