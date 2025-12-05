import React, { useState, useEffect } from 'react';
import geocodingService from '../services/geocodingService.js';
import './LocationPermission.css';

const LocationDetector = ({ onLocationUpdate, onLocationError }) => {
  const [locationStatus, setLocationStatus] = useState('detecting'); // detecting, granted, denied, error, success
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);
  const [placeName, setPlaceName] = useState(null);
  const [geoloadingPlaceName, setGeoloadingPlaceName] = useState(false);

  const detectLocation = async (highAccuracy = true) => {
    setLocationStatus('detecting');
    setError(null);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser';
      setError(errorMsg);
      setLocationStatus('error');
      if (onLocationError) onLocationError(errorMsg);
      return;
    }

    const options = {
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 15000 : 10000, // More time for high accuracy
      maximumAge: highAccuracy ? 0 : 300000 // 5 minutes cache for low accuracy
    };

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('🌍 Location detected:', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date(pos.timestamp).toISOString()
            });
            resolve(pos);
          },
          (err) => {
            console.error('❌ Geolocation error:', err);
            reject(err);
          },
          options
        );
      });

      const locationInfo = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
        source: 'gps',
        highAccuracy: highAccuracy,
        provider: 'html5_geolocation'
      };

      setLocationData(locationInfo);
      setLocationStatus('success');
      
      // Determine if this is in Jamaica (rough bounds check)
      const inJamaica = isLocationInJamaica(locationInfo.latitude, locationInfo.longitude);
      locationInfo.inJamaica = inJamaica;
      locationInfo.country = inJamaica ? 'Jamaica' : 'Unknown';

      // Get place name from coordinates
      setGeoloadingPlaceName(true);
      try {
        const place = await geocodingService.getPlaceName(locationInfo.latitude, locationInfo.longitude);
        setPlaceName(place);
        locationInfo.placeName = place;
        locationInfo.shortPlaceName = await geocodingService.getShortPlaceName(locationInfo.latitude, locationInfo.longitude);
      } catch (geoError) {
        console.error('Failed to get place name:', geoError);
        locationInfo.placeName = `${locationInfo.latitude.toFixed(4)}, ${locationInfo.longitude.toFixed(4)}`;
        locationInfo.shortPlaceName = locationInfo.placeName;
        setPlaceName(locationInfo.placeName);
      } finally {
        setGeoloadingPlaceName(false);
      }

      if (onLocationUpdate) {
        onLocationUpdate(locationInfo);
      }

      return locationInfo;

    } catch (geoError) {
      let errorMessage = 'Location detection failed';
      
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          errorMessage = 'Location access denied by user';
          setLocationStatus('denied');
          break;
        case geoError.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable';
          setLocationStatus('error');
          break;
        case geoError.TIMEOUT:
          errorMessage = 'Location request timed out';
          setLocationStatus('error');
          // Try again with lower accuracy if high accuracy timed out
          if (highAccuracy) {
            console.log('🔄 High accuracy timed out, trying standard accuracy...');
            return await detectLocation(false);
          }
          break;
        default:
          errorMessage = `Location error: ${geoError.message}`;
          setLocationStatus('error');
          break;
      }

      setError(errorMessage);
      if (onLocationError) {
        onLocationError(errorMessage, geoError);
      }
      
      throw geoError;
    }
  };

  const watchLocation = () => {
    if (!navigator.geolocation || isWatchingLocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationInfo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'gps_watch',
          highAccuracy: true
        };

        locationInfo.inJamaica = isLocationInJamaica(locationInfo.latitude, locationInfo.longitude);
        locationInfo.country = locationInfo.inJamaica ? 'Jamaica' : 'Unknown';

        // Get place name for watch position too
        try {
          const place = await geocodingService.getPlaceName(locationInfo.latitude, locationInfo.longitude);
          locationInfo.placeName = place;
          locationInfo.shortPlaceName = await geocodingService.getShortPlaceName(locationInfo.latitude, locationInfo.longitude);
          setPlaceName(place);
        } catch (geoError) {
          console.error('Failed to get place name for watch position:', geoError);
          locationInfo.placeName = `${locationInfo.latitude.toFixed(4)}, ${locationInfo.longitude.toFixed(4)}`;
          locationInfo.shortPlaceName = locationInfo.placeName;
          setPlaceName(locationInfo.placeName);
        }

        setLocationData(locationInfo);
        setLocationStatus('success');
        
        if (onLocationUpdate) {
          onLocationUpdate(locationInfo);
        }
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute cache
      }
    );

    setIsWatchingLocation(true);

    // Cleanup function
    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsWatchingLocation(false);
    };
  };

  const isLocationInJamaica = (lat, lng) => {
    // Jamaica bounds: approximately 17.7°N to 18.5°N, 78.4°W to 76.2°W
    return lat >= 17.7 && lat <= 18.5 && lng >= -78.4 && lng <= -76.2;
  };

  const requestLocationPermission = async () => {
    if (!navigator.permissions) {
      // Fallback: just try to get location
      return await detectLocation();
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        return await detectLocation();
      } else if (permission.state === 'prompt') {
        setLocationStatus('requesting');
        return await detectLocation();
      } else {
        setLocationStatus('denied');
        throw new Error('Geolocation permission denied');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      // Fallback: try anyway
      return await detectLocation();
    }
  };

  // Attempt to get location on component mount
  useEffect(() => {
    requestLocationPermission().catch(error => {
      console.error('Initial location detection failed:', error);
    });
  }, []);

  const getStatusMessage = () => {
    switch (locationStatus) {
      case 'detecting':
        return '🌍 Detecting your location...';
      case 'requesting':
        return '📍 Requesting location permission...';
      case 'granted':
        return '✅ Location access granted';
      case 'denied':
        return '❌ Location access denied';
      case 'error':
        return `❌ Location error: ${error}`;
      case 'success': {
        if (geoloadingPlaceName) {
          return '📍 Location detected, getting place name...';
        }
        const placeInfo = placeName || `${locationData?.latitude.toFixed(4)}, ${locationData?.longitude.toFixed(4)}`;
        const accuracyInfo = locationData?.accuracy ? ` (±${Math.round(locationData.accuracy)}m)` : '';
        const providerInfo = locationData?.accuracy && locationData.accuracy < 20 ? ' 🗺️' : '';
        return locationData?.inJamaica 
          ? `📍 ${placeInfo}${accuracyInfo}${providerInfo} 🇯🇲`
          : `📍 ${placeInfo}${accuracyInfo}${providerInfo}`;
      }
      default:
        return '❓ Unknown location status';
    }
  };

  const getLocationSummary = () => {
    if (!locationData) return null;

    return {
      status: locationStatus,
      coordinates: `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`,
      accuracy: `±${Math.round(locationData.accuracy)}m`,
      inJamaica: locationData.inJamaica,
      country: locationData.country,
      timestamp: new Date(locationData.timestamp).toLocaleString(),
      source: locationData.source
    };
  };

  return (
    <div className="location-detector">
      <div className={`location-status ${locationStatus}`}>
        <span className="status-message">{getStatusMessage()}</span>
        
        {locationStatus === 'denied' && (
          <button 
            className="retry-location-btn"
            onClick={() => requestLocationPermission()}
          >
            🔄 Retry Location
          </button>
        )}
        
        {locationStatus === 'success' && (
          <div className="location-details">
            <div className="location-primary">
              <strong>📍 {placeName || 'Getting location name...'}</strong>
              {locationData?.inJamaica ? ' 🇯🇲' : ' 🌍'}
            </div>
            <small className="location-secondary">
              Coordinates: {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
              {locationData.accuracy && ` (±${Math.round(locationData.accuracy)}m accuracy)`}
            </small>
          </div>
        )}
      </div>
      
      {locationStatus === 'success' && !locationData?.inJamaica && (
        <div className="location-warning">
          ⚠️ You appear to be outside Jamaica. Hospital distances may be very large.
        </div>
      )}
    </div>
  );
};

export default LocationDetector;