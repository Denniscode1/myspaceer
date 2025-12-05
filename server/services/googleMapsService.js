/**
 * Google Maps Service
 * Provides high-accuracy location services using Google Maps APIs
 * - Geocoding API: Convert coordinates to addresses with high precision
 * - Directions API: Calculate routes with real-time traffic data
 * - Distance Matrix API: Batch calculate travel times to multiple hospitals
 */

import fetch from 'node-fetch';

export class GoogleMapsService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes for route cache
    this.geocodeTimeout = 3600000; // 1 hour for geocoding cache
    
    if (!this.apiKey) {
      console.warn('⚠️ Google Maps API key not configured. Service will use fallback methods.');
    }
  }

  /**
   * Check if Google Maps API is available
   */
  isAvailable() {
    return !!this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY';
  }

  /**
   * Reverse geocode coordinates to get detailed address information
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} Address details with high precision
   */
  async reverseGeocode(latitude, longitude) {
    if (!this.isAvailable()) {
      throw new Error('Google Maps API not configured');
    }

    const cacheKey = `geocode_${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.geocodeTimeout) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'No results'}`);
      }

      const result = data.results[0];
      const addressComponents = this.parseAddressComponents(result.address_components);
      
      const geocodeData = {
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        components: addressComponents,
        location_type: result.geometry.location_type,
        accuracy: this.getAccuracyEstimate(result.geometry.location_type),
        provider: 'google_maps',
        short_name: this.formatShortName(addressComponents),
        timestamp: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: geocodeData,
        timestamp: Date.now()
      });

      return geocodeData;

    } catch (error) {
      console.error('Google Maps geocoding error:', error);
      throw error;
    }
  }

  /**
   * Calculate route directions between two points with real-time traffic
   * @param {Object} origin - {lat, lng}
   * @param {Object} destination - {lat, lng}
   * @param {string} mode - Travel mode: 'driving', 'walking', 'bicycling', 'transit'
   * @returns {Promise<Object>} Route details with traffic-aware duration
   */
  async getDirections(origin, destination, mode = 'driving') {
    if (!this.isAvailable()) {
      throw new Error('Google Maps API not configured');
    }

    const cacheKey = `directions_${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}_${mode}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/directions/json?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destination.lat},${destination.lng}&` +
        `mode=${mode}&` +
        `departure_time=now&` +
        `traffic_model=best_guess&` +
        `key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        throw new Error(`Directions failed: ${data.status} - ${data.error_message || 'No routes found'}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      
      const routeData = {
        distance_meters: leg.distance.value,
        distance_text: leg.distance.text,
        duration_seconds: leg.duration.value,
        duration_text: leg.duration.text,
        duration_in_traffic_seconds: leg.duration_in_traffic?.value || leg.duration.value,
        duration_in_traffic_text: leg.duration_in_traffic?.text || leg.duration.text,
        traffic_factor: leg.duration_in_traffic ? 
          (leg.duration_in_traffic.value / leg.duration.value) : 1.0,
        start_address: leg.start_address,
        end_address: leg.end_address,
        steps: leg.steps.length,
        provider: 'google_maps',
        mode: mode,
        timestamp: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: routeData,
        timestamp: Date.now()
      });

      return routeData;

    } catch (error) {
      console.error('Google Maps directions error:', error);
      throw error;
    }
  }

  /**
   * Calculate travel times to multiple destinations using Distance Matrix API
   * More efficient for batch calculations
   * @param {Object} origin - {lat, lng}
   * @param {Array<Object>} destinations - Array of {lat, lng, hospital_id, name}
   * @param {string} mode - Travel mode
   * @returns {Promise<Array>} Array of route data for each destination
   */
  async getDistanceMatrix(origin, destinations, mode = 'driving') {
    if (!this.isAvailable()) {
      throw new Error('Google Maps API not configured');
    }

    if (!destinations || destinations.length === 0) {
      return [];
    }

    // Google Maps API limits: 25 origins × 25 destinations per request
    // For large batches, we need to chunk the requests
    const maxDestinations = 25;
    const chunks = [];
    
    for (let i = 0; i < destinations.length; i += maxDestinations) {
      chunks.push(destinations.slice(i, i + maxDestinations));
    }

    const allResults = [];

    for (const chunk of chunks) {
      try {
        const destinationsParam = chunk.map(d => `${d.lat},${d.lng}`).join('|');
        
        const url = `${this.baseUrl}/distancematrix/json?` +
          `origins=${origin.lat},${origin.lng}&` +
          `destinations=${destinationsParam}&` +
          `mode=${mode}&` +
          `departure_time=now&` +
          `traffic_model=best_guess&` +
          `key=${this.apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
          console.error(`Distance Matrix failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
          continue;
        }

        const row = data.rows[0];
        
        chunk.forEach((destination, index) => {
          const element = row.elements[index];
          
          if (element.status === 'OK') {
            allResults.push({
              hospital_id: destination.hospital_id,
              hospital_name: destination.name,
              hospital: destination,
              distance_meters: element.distance.value,
              distance_text: element.distance.text,
              duration_seconds: element.duration.value,
              duration_text: element.duration.text,
              duration_in_traffic_seconds: element.duration_in_traffic?.value || element.duration.value,
              duration_in_traffic_text: element.duration_in_traffic?.text || element.duration.text,
              traffic_factor: element.duration_in_traffic ? 
                (element.duration_in_traffic.value / element.duration.value) : 1.0,
              provider: 'google_maps',
              mode: mode,
              timestamp: Date.now()
            });
          } else {
            console.warn(`No route to ${destination.name}: ${element.status}`);
          }
        });

      } catch (error) {
        console.error('Distance Matrix chunk error:', error);
      }
    }

    return allResults;
  }

  /**
   * Parse Google Maps address components into structured format
   */
  parseAddressComponents(components) {
    const parsed = {};
    
    const typeMap = {
      street_number: 'street_number',
      route: 'street',
      neighborhood: 'neighborhood',
      locality: 'city',
      administrative_area_level_1: 'parish',
      administrative_area_level_2: 'district',
      country: 'country',
      postal_code: 'postal_code'
    };

    components.forEach(component => {
      component.types.forEach(type => {
        if (typeMap[type]) {
          parsed[typeMap[type]] = component.long_name;
          parsed[`${typeMap[type]}_short`] = component.short_name;
        }
      });
    });

    return parsed;
  }

  /**
   * Format a short, readable place name from address components
   */
  formatShortName(components) {
    const parts = [];
    
    if (components.neighborhood) {
      parts.push(components.neighborhood);
    } else if (components.street) {
      parts.push(components.street);
    }
    
    if (components.city) {
      parts.push(components.city);
    }
    
    if (components.parish && parts.length < 2) {
      parts.push(components.parish);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
  }

  /**
   * Estimate accuracy in meters based on Google's location_type
   */
  getAccuracyEstimate(locationType) {
    const accuracyMap = {
      'ROOFTOP': 5,           // Precise location (±5m)
      'RANGE_INTERPOLATED': 20, // Interpolated (±20m)
      'GEOMETRIC_CENTER': 50,   // Center of location (±50m)
      'APPROXIMATE': 100        // Approximate (±100m)
    };
    
    return accuracyMap[locationType] || 100;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      available: this.isAvailable()
    };
  }

  /**
   * Validate Jamaica bounds
   */
  isInJamaica(latitude, longitude) {
    // Jamaica bounds: approximately 17.7°N to 18.5°N, 78.4°W to 76.2°W
    return latitude >= 17.7 && latitude <= 18.5 && longitude >= -78.4 && longitude <= -76.2;
  }
}

// Create and export singleton instance
const googleMapsService = new GoogleMapsService();
export default googleMapsService;

// Export utility functions
export const reverseGeocode = (lat, lng) => googleMapsService.reverseGeocode(lat, lng);
export const getDirections = (origin, dest, mode) => googleMapsService.getDirections(origin, dest, mode);
export const getDistanceMatrix = (origin, dests, mode) => googleMapsService.getDistanceMatrix(origin, dests, mode);
