import React from 'react';
import { DashboardShareLinks } from '../types';

interface ShareLinkStatusCardProps {
  shareLinks: DashboardShareLinks;
}


/**
 * Card tổng quan tình trạng link chia sẻ sổ ảnh.
 * @param props Dữ liệu shareLinks từ dashboard.
 * @returns JSX card share links.
 */
function ShareLinkStatusCard({ shareLinks }: ShareLinkStatusCardProps) {
  return (
    <div className="dash-sharelink-card-v2">
      <div className="dash-link-groups">
        {/* Nhóm 1: Link đang hoạt động */}
        <div className="dash-link-group">
          <div className="dash-link-group-header">
            <span className="dash-group-title text-success">
              <i className="bi bi-check-circle-fill me-2"></i> Link đang hoạt động
            </span>
            <span className="dash-group-count">{shareLinks.activeCount}</span>
          </div>
          <div className="dash-group-details ps-4">
            <div className="dash-detail-row">
              <span className="detail-label text-muted small">Công khai:</span>
              <span className="detail-value fw-semibold">{shareLinks.publicActiveCount}</span>
            </div>
            <div className="dash-detail-row">
              <span className="detail-label text-muted small">Yêu cầu đăng nhập:</span>
              <span className="detail-value fw-semibold">{shareLinks.privateActiveCount}</span>
            </div>
          </div>
        </div>

        {/* Nhóm 2: Sắp hết hạn */}
        <div className="dash-link-group mt-3">
          <div className="dash-link-group-header">
            <span className="dash-group-title text-warning">
              <i className="bi bi-exclamation-triangle-fill me-2"></i> Sắp hết hạn (24h)
            </span>
            <span className="dash-group-count">{shareLinks.expiringSoon24hCount}</span>
          </div>
        </div>

        {/* Nhóm 3: Đã hết hạn / Tắt */}
        <div className="dash-link-group mt-3 opacity-75">
          <div className="dash-link-group-header">
            <span className="dash-group-title text-secondary">
              <i className="bi bi-x-circle-fill me-2"></i> Đã hết hạn / Đã tắt
            </span>
            <span className="dash-group-count">{shareLinks.expiredOrInactiveCount}</span>
          </div>
        </div>
      </div>

      {shareLinks.totalLinks === 0 && (
        <p className="dash-sharelink-empty mt-3">Chưa tạo link chia sẻ nào.</p>
      )}
    </div>
  );
}

export default ShareLinkStatusCard;
