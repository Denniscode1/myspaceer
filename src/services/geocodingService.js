/**
 * Geocoding Service
 * Converts latitude/longitude coordinates to readable place names
 */

class GeocodingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
  }

  /**
   * Get place name from coordinates using OpenStreetMap Nominatim API (free)
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<string>} Place name or coordinates as fallback
   */
  async getPlaceName(latitude, longitude) {
    // Create cache key
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.placeName;
    }

    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'MYSpaceER-Emergency-System/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.address) {
        throw new Error('No address data returned');
      }

      // Format the place name based on available information
      const placeName = this.formatPlaceName(data, latitude, longitude);
      
      // Cache the result
      this.cache.set(cacheKey, {
        placeName,
        timestamp: Date.now()
      });

      return placeName;

    } catch (error) {
      console.error('Geocoding error:', error);
      
      // Return formatted coordinates as fallback
      const fallbackName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      
      // Cache the fallback to avoid repeated failed requests
      this.cache.set(cacheKey, {
        placeName: fallbackName,
        timestamp: Date.now()
      });
      
      return fallbackName;
    }
  }

  /**
   * Format place name from geocoding response
   * @param {Object} data - Geocoding API response
   * @param {number} lat - Original latitude
   * @param {number} lng - Original longitude
   * @returns {string} Formatted place name
   */
  formatPlaceName(data, lat, lng) {
    const address = data.address || {};
    
    // Priority order for location components
    const locationParts = [];
    
    // Add specific location (building, shop, etc.)
    if (address.shop || address.amenity || address.building) {
      locationParts.push(address.shop || address.amenity || address.building);
    }
    
    // Add road/street
    if (address.road) {
      locationParts.push(address.road);
    } else if (address.pedestrian) {
      locationParts.push(address.pedestrian);
    }
    
    // Add neighborhood/suburb/district
    if (address.neighbourhood) {
      locationParts.push(address.neighbourhood);
    } else if (address.suburb) {
      locationParts.push(address.suburb);
    } else if (address.district) {
      locationParts.push(address.district);
    }
    
    // Add city/town
    if (address.city) {
      locationParts.push(address.city);
    } else if (address.town) {
      locationParts.push(address.town);
    } else if (address.village) {
      locationParts.push(address.village);
    }
    
    // Add parish/state for Jamaica
    if (address.state) {
      locationParts.push(address.state);
    }
    
    // Add country
    if (address.country) {
      locationParts.push(address.country);
    }
    
    // If we have location parts, join them with commas
    if (locationParts.length > 0) {
      // Limit to 3 most relevant parts to keep it readable
      const relevantParts = locationParts.slice(0, 3);
      return relevantParts.join(', ');
    }
    
    // Fallback to display name if available
    if (data.display_name) {
      // Clean up the display name (remove redundant parts)
      const parts = data.display_name.split(', ');
      return parts.slice(0, 3).join(', ');
    }
    
    // Final fallback to coordinates
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /**
   * Get a short place name (city, parish)
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<string>} Short place name
   */
  async getShortPlaceName(latitude, longitude) {
    const fullPlace = await this.getPlaceName(latitude, longitude);
    
    // If it's coordinates, return as is
    if (fullPlace.includes(',') && fullPlace.match(/^\-?\d+\.\d+, \-?\d+\.\d+$/)) {
      return fullPlace;
    }
    
    // Return just the last two parts (usually city/parish and country)
    const parts = fullPlace.split(', ');
    if (parts.length > 2) {
      return parts.slice(-2).join(', ');
    }
    
    return fullPlace;
  }

  /**
   * Check if coordinates appear to be in Jamaica
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {boolean} True if coordinates are within Jamaica bounds
   */
  isInJamaica(latitude, longitude) {
    // Jamaica bounds: approximately 17.7°N to 18.5°N, 78.4°W to 76.2°W
    return latitude >= 17.7 && latitude <= 18.5 && longitude >= -78.4 && longitude <= -76.2;
  }

  /**
   * Clear the geocoding cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number} Number of cached entries
   */
  getCacheSize() {
    return this.cache.size;
  }
}

// Export a singleton instance
const geocodingService = new GeocodingService();
export default geocodingService;