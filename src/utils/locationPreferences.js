// Location permission preference management utilities

export const LocationPreferenceKeys = {
  PERMISSION_GRANTED: 'locationPermissionGranted'
};

export const LocationPreferenceValues = {
  GRANTED: 'true',
  DENIED: 'false',
  NOT_SET: null
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

// For development/debugging - expose function to clear preferences
if (process.env.NODE_ENV === 'development') {
  window.clearLocationPreferences = clearLocationPermissionPreference;
  window.getLocationPreference = getLocationPermissionPreference;
}