import React from 'react';

interface DashboardFiltersProps {
  startDate: string;
  endDate: string;
  onFilterChange: (filters: { startDate: string; endDate: string }) => void;
}

/**
 * Bộ lọc cho Dashboard: Khoảng ngày.
 */
const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  startDate,
  endDate,
  onFilterChange,
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ startDate: e.target.value, endDate });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ startDate, endDate: e.target.value });
  };

  return (
    <div
      className="dash-filters-wrapper mb-4"
      style={{
        position: 'sticky',
        top: '70px',
        zIndex: 1020,
      }}
    >
      <div className="dash-filter-section report-filter p-3 rounded-3 bg-light border shadow-sm">
        <div className="row g-3 align-items-center">
          <div className="col-auto">
            <span className="fw-semibold small text-muted text-uppercase">Khoảng thời gian báo cáo:</span>
          </div>

          <div className="col-auto">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">Từ</span>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={handleStartDateChange}
              />
            </div>
          </div>

          <div className="col-auto">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">Đến</span>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </div>
          </div>

          <div className="col-auto">
            <button
              className="btn btn-outline-primary btn-sm px-3"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                onFilterChange({
                  startDate: today,
                  endDate: today,
                });
              }}
            >
              Hôm nay
            </button>
          </div>

          <div className="col ms-auto text-end">
            <span className="small text-muted italic">
              * Áp dụng cho: Tổng quan, Thống kê chi tiết, Điểm danh & Chia sẻ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
