import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { DashboardPhotoHealth, DashboardLogistics } from '../types';

// ─────────────────────────────────────────────
// PHOTO HEALTH CHART
// ─────────────────────────────────────────────

interface PhotoHealthChartProps {
  photoHealth: DashboardPhotoHealth;
}

const PHOTO_COLORS = {
  loaded: '#22c55e',
  pending: '#f59e0b',
  notFound: '#ef4444',
};

/**
 * Biểu đồ tròn trạng thái ảnh sinh viên (Loaded / Pending / NotFound).
 * @param props Dữ liệu photo health từ dashboard.
 * @returns JSX biểu đồ tròn.
 */
export function PhotoHealthChart({ photoHealth }: PhotoHealthChartProps) {
  const data = [
    { name: 'Có ảnh', value: photoHealth.loadedCount, color: PHOTO_COLORS.loaded },
    { name: 'Chờ xử lý', value: photoHealth.pendingCount, color: PHOTO_COLORS.pending },
    { name: 'Không tìm thấy', value: photoHealth.notFoundCount, color: PHOTO_COLORS.notFound },
  ].filter((d) => d.value > 0);

  const total = photoHealth.loadedCount + photoHealth.pendingCount + photoHealth.notFoundCount;

  if (total === 0) {
    return <div className="dash-chart-empty">Chưa có dữ liệu ảnh</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${Math.round((percent ?? 0) * 100)}%`}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} SV`, '']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────
// ROOM CHART
// ─────────────────────────────────────────────

interface RoomChartProps {
  byRoom: DashboardLogistics['byRoom'];
}

/**
 * Biểu đồ cột ngang số sinh viên theo phòng thi (Top 10).
 * @param props Mảng thống kê theo phòng.
 * @returns JSX biểu đồ cột.
 */
export function ExamRoomChart({ byRoom }: RoomChartProps) {
  const data = byRoom.slice(0, 10).map((r) => ({
    room: r.examRoom,
    'Sinh viên': r.studentCount,
    'Số lớp': r.classCount,
  }));

  if (data.length === 0) {
    return <div className="dash-chart-empty">Chưa có dữ liệu phòng thi</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 160)}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="room" width={90} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="Sinh viên" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────
// SHIFT CHART
// ─────────────────────────────────────────────

interface ShiftChartProps {
  byShift: DashboardLogistics['byShift'];
}

const SHIFT_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

/**
 * Biểu đồ cột phân bổ số lớp và sinh viên theo ca thi.
 * @param props Mảng thống kê theo ca thi.
 * @returns JSX biểu đồ cột.
 */
export function ExamShiftChart({ byShift }: ShiftChartProps) {
  const data = byShift.map((s) => ({
    ca: s.examShift,
    'Số lớp': s.classCount,
    'Sinh viên': s.studentCount,
  }));

  if (data.length === 0) {
    return <div className="dash-chart-empty">Chưa có dữ liệu ca thi</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ca" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="Sinh viên" fill="#6366f1" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={SHIFT_COLORS[index % SHIFT_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────
// COURSE CHART
// ─────────────────────────────────────────────

interface CourseChartProps {
  byCourse: DashboardLogistics['byCourse'];
}

/**
 * Biểu đồ cột ngang số sinh viên theo học phần (Top 8).
 * @param props Mảng thống kê theo học phần.
 * @returns JSX biểu đồ cột.
 */
export function CourseDistributionChart({ byCourse }: CourseChartProps) {
  const data = byCourse.slice(0, 8).map((c) => ({
    course: c.courseCode,
    fullName: c.courseName,
    'Sinh viên': c.studentCount,
    'Số lớp': c.classCount,
  }));

  if (data.length === 0) {
    return <div className="dash-chart-empty">Chưa có dữ liệu học phần</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 160)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="course"
          width={80}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value, name) => [value, name]}
          labelFormatter={(label) => {
            const item = data.find((d) => d.course === label);
            return item ? `${label} - ${item.fullName}` : label;
          }}
        />
        <Bar dataKey="Sinh viên" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
