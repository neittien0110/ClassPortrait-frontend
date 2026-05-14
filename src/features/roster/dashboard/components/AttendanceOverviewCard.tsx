import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardAttendance } from '../types';

interface AttendanceOverviewCardProps {
  attendance: DashboardAttendance;
}

/**
 * Card thống kê tổng quan điểm danh thí sinh toàn kỳ thi.
 * Hiển thị tỷ lệ có mặt, số lớp đã/chưa điểm danh.
 */
function AttendanceOverviewCard({ attendance }: AttendanceOverviewCardProps) {
  const {
    totalStudents,
    totalPresent,
    totalAbsent,
    totalNotMarked,
    classesWithAttendance,
    classesWithoutAttendance
  } = attendance;

  const totalClasses = classesWithAttendance + classesWithoutAttendance;
  const progressPercent = totalClasses > 0 ? Math.round((classesWithAttendance / totalClasses) * 100) : 0;

  // Dữ liệu cho biểu đồ tròn
  const chartData = [
    { name: 'Có mặt', value: totalPresent, color: '#22c55e' },
    { name: 'Vắng mặt', value: totalAbsent, color: '#ef4444' },
    { name: 'Chưa điểm danh', value: totalNotMarked, color: '#94a3b8' },
  ];

  return (
    <div className="dash-attendance-card-v2">
      <div className="row align-items-center">
        {/* Bên trái: Biểu đồ tròn */}
        <div className="col-md-5">
          <div style={{ height: '180px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bên phải: Danh sách chỉ số */}
        <div className="col-md-7">
          <div className="dash-att-list">
            <div className="dash-att-item">
              <span className="att-label">Tổng thí sinh</span>
              <span className="att-value text-dark">{totalStudents}</span>
            </div>
            <div className="dash-att-item">
              <span className="att-label">
                <span className="att-dot bg-success"></span> Có mặt
              </span>
              <span className="att-value text-success">{totalPresent}</span>
            </div>
            <div className="dash-att-item">
              <span className="att-label">
                <span className="att-dot bg-danger"></span> Vắng mặt
              </span>
              <span className="att-value text-danger">{totalAbsent}</span>
            </div>
            <div className="dash-att-item">
              <span className="att-label">
                <span className="att-dot bg-secondary"></span> Chưa điểm danh
              </span>
              <span className="att-value text-muted">{totalNotMarked}</span>
            </div>
            <div className="dash-att-divider-h"></div>
            <div className="dash-att-item pt-1">
              <span className="att-label fw-bold">Tiến độ điểm danh</span>
              <span className="att-value fw-bold text-primary">
                {classesWithAttendance}/{totalClasses} lớp ({progressPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceOverviewCard;
