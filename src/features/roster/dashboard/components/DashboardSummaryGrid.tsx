import React from 'react';
import { DashboardOverviewSummary } from '../types';
import { formatPercent } from '../utils/dashboardHelpers';

interface DashboardSummaryGridProps {
  overview: DashboardOverviewSummary;
  validPhotoRate: number;
  classesWithIncompletePhoto: number;
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  status?: 'neutral' | 'good' | 'warning' | 'danger';
}

/**
 * Thẻ chỉ số đơn lẻ trong lưới tổng quan.
 * @param props Dữ liệu hiển thị cho thẻ.
 * @returns JSX thẻ chỉ số.
 */
function SummaryCard({ label, value, subLabel, status = 'neutral' }: SummaryCardProps) {
  return (
    <article className={`dash-kpi-card is-${status}`}>
      <div className="dash-kpi-body">
        <span className="dash-kpi-label">{label}</span>
        <strong className="dash-kpi-value">{value}</strong>
        {subLabel && <span className="dash-kpi-sub">{subLabel}</span>}
      </div>
    </article>
  );
}

/**
 * Lưới thẻ KPI tổng quan toàn hệ thống (Exam Command Center).
 * @param props Dữ liệu overview và photo health từ dashboard.
 * @returns JSX lưới KPI.
 */
function DashboardSummaryGrid({ overview, validPhotoRate, classesWithIncompletePhoto }: DashboardSummaryGridProps) {
  const photoStatus = validPhotoRate >= 100 ? 'good' : validPhotoRate >= 80 ? 'neutral' : 'warning';
  const todayStatus = overview.classesWithExamToday > 0 ? 'warning' : 'neutral';
  const incompleteStatus = classesWithIncompletePhoto > 0 ? 'danger' : 'good';

  return (
    <div className="dash-kpi-grid">
      <SummaryCard
        label="Tổng số lớp thi"
        value={overview.totalClasses}
        status="neutral"
      />
      <SummaryCard
        label="Tổng sinh viên"
        value={overview.totalStudents}
        status="neutral"
      />
      <SummaryCard
        label="Số học phần"
        value={overview.totalDistinctCourses}
        status="neutral"
      />
      <SummaryCard
        label="Số phòng thi"
        value={overview.totalDistinctRooms}
        status="neutral"
      />
      <SummaryCard
        label="Số ca thi"
        value={overview.totalDistinctShifts}
        status="neutral"
      />
      <SummaryCard
        label="Lớp thi hôm nay"
        value={overview.classesWithExamToday}
        subLabel={`${overview.classesWithExamThisWeek} lớp trong tuần`}
        status={todayStatus}
      />
      <SummaryCard
        label="Tỷ lệ ảnh đạt chuẩn"
        value={formatPercent(validPhotoRate)}
        status={photoStatus}
      />
      <SummaryCard
        label="Lớp thiếu ảnh"
        value={classesWithIncompletePhoto}
        subLabel="lớp chưa đủ 100% ảnh"
        status={incompleteStatus}
      />
    </div>
  );
}

export default DashboardSummaryGrid;
