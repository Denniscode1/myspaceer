import React from 'react';
import './ModernStatsCards.css';

const ModernStatsCards = ({ submissions }) => {
  const totalSubmissions = submissions.length;
  const severeCount = submissions.filter(s => s.criticality === 'severe').length;
  const moderateCount = submissions.filter(s => s.criticality === 'moderate').length;
  const mildCount = submissions.filter(s => s.criticality === 'mild').length;

  const statsData = [
    {
      id: 'total',
      label: 'Total Patients',
      value: totalSubmissions,
      change: '+12%',
      changeType: 'increase',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      color: 'blue'
    },
    {
      id: 'severe',
      label: 'Critical Cases',
      value: severeCount,
      change: '+3%',
      changeType: 'increase',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 17h.01" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      color: 'red'
    },
    {
      id: 'moderate',
      label: 'Moderate Cases',
      value: moderateCount,
      change: '-5%',
      changeType: 'decrease',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 8v8" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 12h8" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      color: 'orange'
    },
    {
      id: 'mild',
      label: 'Mild Cases',
      value: mildCount,
      change: '+8%',
      changeType: 'increase',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      color: 'green'
    }
  ];

  return (
    <div className="modern-stats-grid">
      {statsData.map((stat) => (
        <div key={stat.id} className={`stat-card ${stat.color}`}>
          <div className="stat-header">
            <div className={`stat-icon ${stat.color}`}>
              {stat.icon}
            </div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.changeType === 'increase' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <polyline points="23,7 16,7 16,14" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 14l9-9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M1 21h4v-4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <polyline points="23,17 16,17 16,10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 10l9 9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M1 3h4v4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
              <span>{stat.change}</span>
            </div>
          </div>
          
          <div className="stat-content">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
          
          <div className="stat-footer">
            <div className="stat-progress">
              <div className={`progress-bar ${stat.color}`} style={{width: `${Math.min((stat.value / totalSubmissions) * 100, 100)}%`}}></div>
            </div>
            <div className="stat-subtitle">vs last month</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModernStatsCards;