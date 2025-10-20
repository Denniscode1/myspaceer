import React, { useState } from 'react';
import './ModernHeader.css';

const ModernHeader = ({ user, onRefresh, isLoading, notifications, onToggleSidebar, searchQuery, onSearchChange }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <header className="modern-header">
      {/* Mobile Menu Button */}
      <button className="mobile-menu-btn" onClick={onToggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Page Title */}
      <div className="header-title">
        <h1>Product Dashboard</h1>
        <span className="breadcrumb">Dashboard / Overview</span>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 1 5.25 5.25a7.5 7.5 0 0 1 11.4 11.4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        {/* Refresh Button */}
        {onRefresh && (
          <button 
            className="action-button refresh-btn" 
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Data"
          >
            <svg className={`refresh-icon ${isLoading ? 'spinning' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Notifications */}
        <div className="notification-wrapper">
          <button 
            className="action-button notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                <span className="notifications-count">{notifications?.length || 0}</span>
              </div>
              <div className="notifications-list">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification, index) => (
                    <div 
                      key={notification.id || index}
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    >
                      <div className="notification-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" fill="currentColor"/>
                          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="notification-content">
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        {user && (
          <div className="user-avatar-header">
            <div className="avatar">
              <span>{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-info-header">
              <span className="user-name">Dr. {user.username}</span>
              <span className="user-status">Online</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default ModernHeader;