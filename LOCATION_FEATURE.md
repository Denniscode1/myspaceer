# Location Permission Feature

## Overview
The location access feature has been enhanced to remember user preferences and only show the permission popup for new users.

## How It Works

### For Returning Users
- **Previously Granted**: If a user has previously granted location access, the app will automatically attempt to get their location without showing the popup
- **Previously Denied**: If a user has previously denied location access, no popup will be shown and the app will work without location features

### For New Users
- A location permission popup will appear 2 seconds after the form loads
- User can choose to "Allow Access" or "Don't Allow"
- Their choice is remembered for future visits

## User Benefits
- **No repeated interruptions**: The location popup only appears once per user
- **Seamless experience**: Returning users who granted permission get automatic location access
- **Respects privacy**: Users who denied access won't be asked again

## Features
- **Smart detection**: Uses localStorage to determine if a user is new or returning
- **Error handling**: Properly handles location errors and permission denials
- **Privacy-focused**: Location data is only used for emergency response and not stored permanently

## Development Features
In development mode, you can use these browser console commands:
- `clearLocationPreferences()` - Reset location preference (makes user appear as new)
- `getLocationPreference()` - Check current preference (true/false/null)

## Technical Implementation

### Key Components
- `LocationPermission.jsx` - Handles permission UI and geolocation API
- `locationPreferences.js` - Utility functions for managing preferences
- Form integration in `form.jsx` - Controls when to show the popup

### Storage
- Uses `localStorage` with key: `locationPermissionGranted`
- Values: `'true'` (granted), `'false'` (denied), or not set (new user)

### Flow
1. Form loads → Check if new user
2. If new user → Show popup after 2 seconds
3. User responds → Save preference to localStorage
4. Next visit → Check preference and act accordingly

## Testing
To test the "new user" experience:
1. Open browser developer console
2. Run: `clearLocationPreferences()`
3. Refresh the page
4. The popup should appear again after 2 seconds