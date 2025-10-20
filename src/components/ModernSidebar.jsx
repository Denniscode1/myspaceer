import React from 'react';
import './ModernSidebar.css';

const ModernSidebar = ({ user, activeTab, onTabChange, onLogout, onBackToForm }) => {
  console.log('ModernSidebar loaded!');
  const menuItems = [
    {
      id: 'patients',
      label: 'Patient Records',
      icon: '👥',
      count: null
    },
    {
      id: 'queue',
      label: 'Queue Management',
      icon: '🏥',
      count: null
    },
    {
      id: 'treated',
      label: 'Treated Patients',
      icon: '✅',
      count: null
    }
  ];

  return (
    <div className="modern-sidebar">
      {/* Logo/Brand Section */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">🏥</div>
          <div className="brand-text">
            <h3>MYSpaceER</h3>
            <span>Emergency Response</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.count && <span className="nav-count">{item.count}</span>}
          </button>
        ))}
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="user-section">
          <div className="user-profile">
            <div className="user-avatar">
              <span>{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-info">
              <div className="user-name">Dr. {user.username}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          
          <div className="user-actions">
            <button className="action-btn" onClick={onBackToForm} title="Back to Form">
              📝
            </button>
            <button className="action-btn logout" onClick={onLogout} title="Logout">
              🚪
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernSidebar;