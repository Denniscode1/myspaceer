import { getHospitals, logEvent, saveTravelEstimate } from './database-enhanced.js';

/**
 * Enhanced Hospital Selection Service
 * Automatically determines the closest and most appropriate hospitals
 */
export class EnhancedHospitalSelection {
  constructor() {
    this.maxResults = 10; // Return top 10 closest hospitals
    this.radiusKm = 100; // Search within 100km radius
  }

  /**
   * Get hospitals with automatic distance calculation and ranking
   */
  async getHospitalsWithDistances(userLocation = null) {
    try {
      // Get all active hospitals
      const hospitals = await getHospitals();
      
      // If no user location provided, return all hospitals with basic info
      if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
        return {
          success: true,
          data: hospitals.map(hospital => ({
            ...hospital,
            distance_km: null,
            travel_time_minutes: null,
            location_status: 'unknown'
          })),
          message: 'Location not provided - showing all hospitals'
        };
      }

      // Calculate distances and travel times for all hospitals
      const hospitalWithDistances = hospitals.map(hospital => {
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          hospital.latitude,
          hospital.longitude
        );

        const travelTime = this.estimateTravelTime(distance, userLocation.transportation_mode || 'self-carry');
        
        return {
          ...hospital,
          distance_km: Math.round(distance * 10) / 10, // Round to 1 decimal
          travel_time_minutes: Math.round(travelTime),
          location_status: 'calculated',
          priority_score: this.calculateHospitalScore(hospital, distance, travelTime, userLocation.criticality)
        };
      });

      // Filter hospitals within reasonable distance and sort by priority score
      const filteredHospitals = hospitalWithDistances
        .filter(hospital => hospital.distance_km <= this.radiusKm)
        .sort((a, b) => b.priority_score - a.priority_score)
        .slice(0, this.maxResults);

      // Log the selection event
      logEvent('hospitals_with_distances_calculated', 'hospital_selection', 'system', null, null, {
        user_location: userLocation,
        total_hospitals: hospitals.length,
        filtered_hospitals: filteredHospitals.length,
        search_radius_km: this.radiusKm
      });

      return {
        success: true,
        data: filteredHospitals,
        metadata: {
          user_location: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            address: userLocation.address || 'Unknown location'
          },
          search_radius_km: this.radiusKm,
          total_hospitals_considered: hospitals.length,
          hospitals_in_range: filteredHospitals.length
        },
        message: `Found ${filteredHospitals.length} hospitals within ${this.radiusKm}km, sorted by suitability`
      };

    } catch (error) {
      console.error('Enhanced hospital selection failed:', error);
      
      // Fallback: return basic hospital list
      const hospitals = await getHospitals();
      return {
        success: true,
        data: hospitals,
        error: 'Distance calculation failed - showing all hospitals',
        message: 'Fallback mode: showing all available hospitals'
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Estimate travel time based on distance and transportation mode
   */
  estimateTravelTime(distanceKm, transportationMode = 'self-carry') {
    // Average speeds in Jamaica (km/h) accounting for traffic and road conditions
    const speeds = {
      'ambulance': 45,      // Emergency vehicle with priority
      'self-carry': 30,     // Private car in normal traffic
      'taxi': 35,           // Taxi with local knowledge
      'bus': 25,            // Public transportation
      'motorcycle': 40      // Motorcycle can navigate traffic better
    };

    const speed = speeds[transportationMode] || speeds['self-carry'];
    
    // Add buffer time for traffic and road conditions in Jamaica
    const bufferFactor = this.getTrafficBufferFactor();
    const adjustedSpeed = speed / bufferFactor;
    
    return (distanceKm / adjustedSpeed) * 60; // Convert to minutes
  }

  /**
   * Get traffic buffer factor based on time of day and location
   */
  getTrafficBufferFactor() {
    const hour = new Date().getHours();
    
    // Jamaica traffic patterns
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      return 1.5; // Rush hour - 50% slower
    } else if (hour >= 10 && hour <= 15) {
      return 1.2; // Daytime traffic - 20% slower
    } else if (hour >= 22 || hour <= 6) {
      return 0.9; // Night - 10% faster
    }
    
    return 1.1; // Normal traffic - 10% slower than ideal
  }

  /**
   * Calculate hospital priority score based on multiple factors
   */
  calculateHospitalScore(hospital, distanceKm, travelTimeMinutes, criticality = 'moderate') {
    let score = 100; // Base score

    // Distance factor (closer is better)
    const distanceScore = Math.max(0, 50 - (distanceKm * 2));
    score += distanceScore;

    // Travel time factor
    const timeScore = Math.max(0, 30 - travelTimeMinutes);
    score += timeScore;

    // Capacity factor (prefer hospitals with availability)
    const utilizationRate = (hospital.current_load || 0) / hospital.capacity;
    if (utilizationRate < 0.7) {
      score += 20; // Good availability
    } else if (utilizationRate < 0.9) {
      score += 10; // Moderate availability
    }
    // No bonus for overloaded hospitals

    // Specialty matching
    const specialtyScore = this.getSpecialtyScore(hospital.specialties, criticality);
    score += specialtyScore;

    // Hospital size/capability factor
    if (hospital.capacity > 300) {
      score += 15; // Large comprehensive hospital
    } else if (hospital.capacity > 150) {
      score += 10; // Medium hospital
    } else if (hospital.capacity < 80) {
      score -= 5; // Small hospital may have limited capabilities
    }

    return Math.round(score);
  }

  /**
   * Calculate specialty matching score
   */
  getSpecialtyScore(specialties = [], criticality = 'moderate') {
    if (!Array.isArray(specialties)) {
      try {
        specialties = JSON.parse(specialties || '[]');
      } catch {
        specialties = [];
      }
    }

    let score = 0;

    // Base emergency capability
    if (specialties.includes('Emergency')) {
      score += 10;
    }

    // Critical case requirements
    if (criticality === 'severe' || criticality === 'critical') {
      if (specialties.includes('ICU')) score += 15;
      if (specialties.includes('Trauma')) score += 15;
      if (specialties.includes('Surgery')) score += 10;
    }

    // General capability bonuses
    if (specialties.includes('Cardiology')) score += 5;
    if (specialties.includes('Neurology')) score += 5;
    if (specialties.length > 3) score += 5; // Comprehensive hospital

    return score;
  }

  /**
   * Get the single best hospital for a specific case
   */
  async getBestHospitalForCase(caseData) {
    const { latitude, longitude, criticality, incident_type, age_range, transportation_mode } = caseData;
    
    if (!latitude || !longitude) {
      throw new Error('Patient location coordinates required for hospital selection');
    }

    const result = await this.getHospitalsWithDistances({
      latitude,
      longitude,
      criticality,
      transportation_mode
    });

    if (!result.success || result.data.length === 0) {
      throw new Error('No suitable hospitals found');
    }

    const bestHospital = result.data[0];
    
    // Generate selection reasoning
    const selectionReason = this.generateSelectionReason(bestHospital, caseData);
    
    logEvent('best_hospital_selected', 'hospital_selection', caseData.report_id || 'unknown', null, null, {
      selected_hospital: bestHospital.hospital_id,
      selection_reason: selectionReason,
      distance_km: bestHospital.distance_km,
      travel_time_minutes: bestHospital.travel_time_minutes,
      priority_score: bestHospital.priority_score,
      case_data: caseData
    });

    return {
      success: true,
      selected_hospital: bestHospital,
      alternatives: result.data.slice(1, 4), // Top 3 alternatives
      selection_reason: selectionReason,
      metadata: result.metadata
    };
  }

  /**
   * Generate human-readable selection reason
   */
  generateSelectionReason(hospital, caseData) {
    const reasons = [];

    if (hospital.distance_km < 10) {
      reasons.push(`closest hospital at ${hospital.distance_km}km`);
    } else if (hospital.distance_km < 25) {
      reasons.push(`nearby hospital at ${hospital.distance_km}km`);
    }

    if (hospital.travel_time_minutes < 20) {
      reasons.push(`fast ${hospital.travel_time_minutes}-minute travel time`);
    }

    const specialties = Array.isArray(hospital.specialties) ? hospital.specialties : 
                       (hospital.specialties ? JSON.parse(hospital.specialties) : []);

    if (caseData.criticality === 'severe' && specialties.includes('ICU')) {
      reasons.push('intensive care unit available');
    }

    if (specialties.includes('Trauma') && ['shooting', 'stabbing', 'motor-vehicle-accident'].includes(caseData.incident_type)) {
      reasons.push('specialized trauma care');
    }

    if (caseData.age_range === '0-10' && specialties.includes('Pediatrics')) {
      reasons.push('pediatric care available');
    }

    if (hospital.capacity > 300) {
      reasons.push('comprehensive medical facility');
    }

    const utilizationRate = (hospital.current_load || 0) / hospital.capacity;
    if (utilizationRate < 0.7) {
      reasons.push('good availability');
    }

    return reasons.length > 0 
      ? `Selected for: ${reasons.join(', ')}.`
      : 'Best available option based on overall suitability.';
  }

  /**
   * Utility functions
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      max_results: this.maxResults,
      search_radius_km: this.radiusKm,
      last_updated: new Date().toISOString(),
      version: '2.0.0'
    };
  }
}

// Create singleton instance
export const enhancedHospitalSelection = new EnhancedHospitalSelection();