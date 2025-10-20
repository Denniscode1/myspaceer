import React, { useState, useEffect } from 'react';
import { getLocationPermissionPreference, setLocationPermissionPreference } from '../utils/locationPreferences.js';
import './LocationPermission.css';

const LocationPermission = ({ onPermissionResponse }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Check if user has already granted permission
  useEffect(() => {
    const permissionPreference = getLocationPermissionPreference();
    
    if (permissionPreference === true) {
      // User has previously granted permission, try to get location directly
      handleAllow(true); // Pass true to indicate this is an automatic request
    }
  }, []);

  const handleAllow = async (isAutomatic = false) => {
    setIsRequesting(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          // Save that permission was granted
          setLocationPermissionPreference(true);
          onPermissionResponse({ granted: true, location });
          setIsRequesting(false);
        },
        (error) => {
          let errorMessage = 'Failed to get location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access was denied by user.';
              // Save that permission was denied
              setLocationPermissionPreference(false);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
              break;
          }
          onPermissionResponse({ granted: false, error: errorMessage });
          setIsRequesting(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      onPermissionResponse({ 
        granted: false, 
        error: 'Geolocation is not supported by this browser.' 
      });
      setIsRequesting(false);
    }
  };

  const handleDeny = () => {
    // Save that user denied permission
    setLocationPermissionPreference(false);
    onPermissionResponse({ granted: false, denied: true });
  };

  return (
    <div className="location-permission-overlay">
      <div className="location-permission-modal">
        <div className="location-permission-header">
          <div className="location-icon">📍</div>
          <h3>Location Access Request</h3>
        </div>
        
        <div className="location-permission-content">
          <p className="location-description">
            This app would like to access your location to:
          </p>
          <ul className="location-benefits">
            <li>📊 Calculate accurate travel time to the hospital</li>
            <li>🚨 Help emergency services locate you quickly</li>
            <li>🎯 Improve response coordination and logistics</li>
          </ul>
          <p className="location-note">
            <strong>Your privacy matters:</strong> Location data is only used for emergency response purposes and is not stored permanently.
          </p>
        </div>

        <div className="location-permission-actions">
          <button 
            className="btn btn-secondary location-btn"
            onClick={handleDeny}
            disabled={isRequesting}
          >
            Don't Allow
          </button>
          <button 
            className="btn btn-primary location-btn"
            onClick={handleAllow}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="loading-spinner"></span>
                Getting Location...
              </>
            ) : (
              'Allow Access'
            )}
          </button>
        </div>

        <div className="location-permission-footer">
          <small>You can change this setting later in your browser preferences</small>
        </div>
      </div>
    </div>
  );
};

export default LocationPermission;