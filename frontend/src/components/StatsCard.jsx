import React from 'react';
import { Card } from 'react-bootstrap';

const StatsCard = ({ title, value, icon, color = 'primary' }) => {
  const colorMap = {
    primary: { bg: '#e0e7ff', text: '#4f46e5', iconBg: '#e0e7ff' },
    success: { bg: '#d1fae5', text: '#065f46', iconBg: '#d1fae5' },
    warning: { bg: '#fef3c7', text: '#92400e', iconBg: '#fef3c7' },
    info: { bg: '#cffafe', text: '#0e7490', iconBg: '#cffafe' },
    danger: { bg: '#fee2e2', text: '#991b1b', iconBg: '#fee2e2' }
  };
  
  const colors = colorMap[color] || colorMap.primary;
  
  return (
    <Card className="shadow-sm border-0 h-100 stat-card">
      <Card.Body className="d-flex align-items-center p-4">
        <div 
          className="rounded-3 d-flex align-items-center justify-content-center me-3"
          style={{ 
            width: '52px', 
            height: '52px', 
            background: colors.iconBg,
            color: colors.text
          }}
        >
          <i className={`bi bi-${icon} fs-3`}></i>
        </div>
        <div>
          <div className="text-muted small text-uppercase fw-semibold stat-label">{title}</div>
          <div className="fs-2 fw-bold stat-value">{value}</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StatsCard;