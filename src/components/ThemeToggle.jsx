import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import './ThemeToggle.css';

const ThemeToggle = ({ className = '', size = 'medium' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle ${className} theme-toggle--${size}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="theme-toggle__track">
        <div className="theme-toggle__thumb">
          <span className="theme-toggle__icon theme-toggle__icon--sun">
            ☀️
          </span>
          <span className="theme-toggle__icon theme-toggle__icon--moon">
            🌙
          </span>
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;