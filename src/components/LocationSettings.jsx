import React, { useState, useEffect } from 'react';
import { 
  getLocationDisplayPreference, 
  setLocationDisplayPreference, 
  LocationDisplayFormat 
} from '../utils/locationPreferences.js';
import './LocationSettings.css';

const LocationSettings = ({ onPreferenceChange }) => {
  const [displayFormat, setDisplayFormat] = useState(LocationDisplayFormat.AUTO);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setDisplayFormat(getLocationDisplayPreference());
  }, []);

  const handleFormatChange = (format) => {
    setDisplayFormat(format);
    setLocationDisplayPreference(format);
    if (onPreferenceChange) {
      onPreferenceChange(format);
    }
  };

  const getFormatDescription = (format) => {
    switch (format) {
      case LocationDisplayFormat.PLACE_NAME:
        return 'Show readable place names (e.g., "Kingston, Jamaica")';
      case LocationDisplayFormat.COORDINATES:
        return 'Show GPS coordinates (e.g., "18.0179, -76.8099")';
      case LocationDisplayFormat.AUTO:
      default:
        return 'Show place names when available, coordinates as fallback';
    }
  };

  const getFormatLabel = (format) => {
    switch (format) {
      case LocationDisplayFormat.PLACE_NAME:
        return '📍 Place Names';
      case LocationDisplayFormat.COORDINATES:
        return '🗺️ Coordinates';
      case LocationDisplayFormat.AUTO:
      default:
        return '🔄 Auto (Recommended)';
    }
  };

  return (
    <div className="location-settings">
      <button 
        className="location-settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Location Display Settings"
      >
        📍 Location Display
        <span className={`toggle-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="location-settings-panel">
          <h4>Location Display Format</h4>
          <p className="settings-description">
            Choose how location information is displayed throughout the application.
          </p>

          <div className="format-options">
            {Object.values(LocationDisplayFormat).map(format => (
              <label key={format} className="format-option">
                <input
                  type="radio"
                  name="locationFormat"
                  value={format}
                  checked={displayFormat === format}
                  onChange={() => handleFormatChange(format)}
                />
                <div className="option-content">
                  <div className="option-label">{getFormatLabel(format)}</div>
                  <div className="option-description">{getFormatDescription(format)}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="settings-note">
            <small>
              <strong>Note:</strong> Place names are retrieved using free geocoding services. 
              If unavailable, coordinates will be shown instead.
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSettings;