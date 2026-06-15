import React from 'react';
import { NavLink } from 'react-router-dom';

interface AppSidebarProps {
  sidebarCollapsed: boolean;
  lecturerDisplayName: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

function AppSidebar({
  sidebarCollapsed,
  lecturerDisplayName,
  onToggleSidebar,
  onLogout,
}: AppSidebarProps) {
  return (
    <>
      <button
        type="button"
        className="sidebar-edge-toggle no-print"
        onClick={onToggleSidebar}
        aria-expanded={!sidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Hiện sidebar' : 'Ẩn sidebar'}
        title={sidebarCollapsed ? 'Hiện sidebar' : 'Ẩn sidebar'}
      >
        <span
          className={`sidebar-edge-toggle-icon ${sidebarCollapsed ? 'is-collapsed' : ''}`}
          aria-hidden="true"
        />
      </button>

      <aside className="app-sidebar no-print">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <strong>Sổ ảnh</strong>
            <span>Thi sinh dự thi</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/classes"
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
          >
            <span>Sổ ảnh</span>
            <small>Quản lý danh sách ảnh</small>
          </NavLink>
          <NavLink
            to="/import-history"
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
          >
            <span>Lịch sử import</span>
            <small>Theo dõi các lần nhập file</small>
          </NavLink>

          <NavLink
            to="/share"
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
          >
            <span>Chia sẻ</span>
            <small>Quản lý link chia sẻ theo từng lớp</small>
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
          >
            <span>Dashboard</span>
            <small>Tổng hợp nhanh theo lớp phụ trách</small>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar" aria-hidden="true">GV</div>
          <div className="sidebar-user-meta">
            <strong>{lecturerDisplayName}</strong>
            <span>Giảng viên</span>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>Đăng xuất</button>
        </div>
      </aside>
    </>
  );
}

export default AppSidebar;
