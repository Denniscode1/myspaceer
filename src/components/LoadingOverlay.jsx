import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ isVisible, message = 'Loading...', icon = null }) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-backdrop">
        <div className="loading-container">
          <div className="loading-content">
            {icon && <div className="loading-icon">{icon}</div>}
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
            <div className="loading-message">{message}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;