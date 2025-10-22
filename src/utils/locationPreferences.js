// Location permission preference management utilities

export const LocationPreferenceKeys = {
  PERMISSION_GRANTED: 'locationPermissionGranted',
  DISPLAY_FORMAT: 'locationDisplayFormat'
};

export const LocationPreferenceValues = {
  GRANTED: 'true',
  DENIED: 'false',
  NOT_SET: null
};

export const LocationDisplayFormat = {
  PLACE_NAME: 'placeName',
  COORDINATES: 'coordinates',
  AUTO: 'auto' // Use place name if available, otherwise coordinates
};

/**
 * Check if user has previously granted location permission
 * @returns {boolean|null} true if granted, false if denied, null if not set
 */
export const getLocationPermissionPreference = () => {
  const preference = localStorage.getItem(LocationPreferenceKeys.PERMISSION_GRANTED);
  if (preference === LocationPreferenceValues.GRANTED) return true;
  if (preference === LocationPreferenceValues.DENIED) return false;
  return null;
};

/**
 * Save location permission preference
 * @param {boolean} granted - Whether permission was granted
 */
export const setLocationPermissionPreference = (granted) => {
  const value = granted ? LocationPreferenceValues.GRANTED : LocationPreferenceValues.DENIED;
  localStorage.setItem(LocationPreferenceKeys.PERMISSION_GRANTED, value);
};

/**
 * Clear location permission preference (useful for testing or reset)
 * This will make the app treat the user as a new user
 */
export const clearLocationPermissionPreference = () => {
  localStorage.removeItem(LocationPreferenceKeys.PERMISSION_GRANTED);
};

/**
 * Check if this is a new user (no location preference set)
 * @returns {boolean} true if new user, false if has preference
 */
export const isNewUser = () => {
  return getLocationPermissionPreference() === null;
};

/**
 * Get location display format preference
 * @returns {string} Display format preference (placeName, coordinates, or auto)
 */
export const getLocationDisplayPreference = () => {
  const preference = localStorage.getItem(LocationPreferenceKeys.DISPLAY_FORMAT);
  return preference || LocationDisplayFormat.AUTO; // Default to auto
};

/**
 * Set location display format preference
 * @param {string} format - Display format (placeName, coordinates, or auto)
 */
export const setLocationDisplayPreference = (format) => {
  if (Object.values(LocationDisplayFormat).includes(format)) {
    localStorage.setItem(LocationPreferenceKeys.DISPLAY_FORMAT, format);
  }
};

/**
 * Clear location display preference
 */
export const clearLocationDisplayPreference = () => {
  localStorage.removeItem(LocationPreferenceKeys.DISPLAY_FORMAT);
};

// For development/debugging - expose functions to manage preferences
if (import.meta.env.DEV) {
  window.clearLocationPreferences = clearLocationPermissionPreference;
  window.getLocationPreference = getLocationPermissionPreference;
  window.getLocationDisplayPreference = getLocationDisplayPreference;
  window.setLocationDisplayPreference = setLocationDisplayPreference;
  window.clearLocationDisplayPreference = clearLocationDisplayPreference;
}
