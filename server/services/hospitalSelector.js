import { getHospitals, logEvent } from '../database-enhanced.js';

/**
 * Jamaica Hospital Selection Service
 * Automatically selects the nearest appropriate hospital based on location and medical needs
 */
export class HospitalSelector {
  constructor() {
    this.jamaicaHospitals = [];
    this.initialize();
  }

  async initialize() {
    try {
      this.jamaicaHospitals = await getHospitals();
      console.log(`Hospital Selector initialized with ${this.jamaicaHospitals.length} Jamaica hospitals`);
    } catch (error) {
      console.error('Failed to initialize hospital selector:', error);
    }
  }

  /**
   * Select the nearest and most appropriate hospital for a patient
   */
  async selectNearestHospital(reportData) {
    const { report_id, latitude, longitude, criticality, incident_type } = reportData;

    if (!latitude || !longitude) {
      throw new Error('Patient location coordinates are required for hospital selection');
    }

    try {
      // Calculate distances to all hospitals
      const hospitalDistances = this.jamaicaHospitals.map(hospital => ({
        ...hospital,
        distance: this.calculateDistance(
          latitude, 
          longitude, 
          hospital.latitude, 
          hospital.longitude
        ),
        travelTime: this.estimateTravelTime(
          latitude, 
          longitude, 
          hospital.latitude, 
          hospital.longitude,
          reportData.transportation_mode
        )
      }));

      // Score hospitals based on multiple factors
      const scoredHospitals = hospitalDistances.map(hospital => ({
        ...hospital,
        score: this.calculateHospitalScore(hospital, reportData)
      }));

      // Sort by score (higher is better)
      const rankedHospitals = scoredHospitals.sort((a, b) => b.score - a.score);

      // Select the best hospital
      const selectedHospital = rankedHospitals[0];

      logEvent('hospital_auto_selected', 'hospital_assignment', report_id, null, null, {
        selected_hospital: selectedHospital.hospital_id,
        distance_km: selectedHospital.distance,
        travel_time_minutes: selectedHospital.travelTime,
        score: selectedHospital.score,
        alternatives_considered: rankedHospitals.length
      });

      return {
        selected_hospital: selectedHospital,
        alternatives: rankedHospitals.slice(1, 4), // Top 3 alternatives
        selection_reason: this.generateSelectionReason(selectedHospital, reportData)
      };

    } catch (error) {
      console.error('Hospital selection failed:', error);
      throw error;
    }
  }

  /**
   * Calculate straight-line distance between two points using Haversine formula
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in kilometers
  }

  /**
   * Estimate travel time based on distance and transportation mode
   */
  estimateTravelTime(lat1, lng1, lat2, lng2, transportationMode) {
    const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
    
    // Average speeds in km/h for different transportation modes in Jamaica
    const speeds = {
      'ambulance': 45, // Emergency vehicle with sirens
      'self-carry': 30, // Private car in traffic
      'taxi': 35,       // Regular taxi
      'bus': 25         // Public transportation
    };

    const speed = speeds[transportationMode] || speeds['self-carry'];
    const travelTimeHours = distance / speed;
    
    return Math.round(travelTimeHours * 60); // Convert to minutes
  }

  /**
   * Calculate comprehensive hospital score based on multiple factors
   */
  calculateHospitalScore(hospital, reportData) {
    const { distance, travelTime } = hospital;
    const { criticality, incident_type, age_range } = reportData;

    let score = 100; // Base score

    // Distance factor (closer is better)
    const distanceScore = Math.max(0, 50 - (distance * 2)); // Penalty increases with distance
    score += distanceScore;

    // Travel time factor (faster is better)
    const timeScore = Math.max(0, 30 - travelTime); // Penalty for longer travel times
    score += timeScore;

    // Specialty matching
    const specialtyScore = this.calculateSpecialtyMatch(hospital, incident_type, criticality);
    score += specialtyScore;

    // Hospital capacity and quality
    const capacityScore = this.calculateCapacityScore(hospital);
    score += capacityScore;

    // Age-specific hospital preferences
    const ageScore = this.calculateAgePreference(hospital, age_range);
    score += ageScore;

    // Regional preferences for Jamaica
    const regionScore = this.calculateRegionalPreference(hospital, reportData);
    score += regionScore;

    return Math.round(score);
  }

  /**
   * Calculate specialty matching score
   */
  calculateSpecialtyMatch(hospital, incidentType, criticality) {
    const specialties = hospital.specialties || [];
    let score = 0;

    // Critical incident type requirements
    const criticalIncidentNeeds = {
      'shooting': ['Trauma', 'Surgery', 'ICU', 'Emergency'],
      'stabbing': ['Trauma', 'Surgery', 'Emergency'],
      'motor-vehicle-accident': ['Trauma', 'Emergency', 'Surgery'],
      'burns': ['Burn Unit', 'ICU', 'Emergency'],
      'cardiac': ['Cardiology', 'ICU', 'Emergency'],
      'stroke': ['Neurology', 'ICU', 'Emergency']
    };

    const neededSpecialties = criticalIncidentNeeds[incidentType] || ['Emergency'];
    
    // Score based on specialty matches
    neededSpecialties.forEach(needed => {
      if (specialties.some(spec => spec.toLowerCase().includes(needed.toLowerCase()))) {
        score += 20;
      }
    });

    // Bonus for comprehensive hospitals
    if (specialties.includes('ICU') && criticality === 'severe') {
      score += 15;
    }

    if (specialties.includes('Trauma') && ['shooting', 'stabbing', 'motor-vehicle-accident'].includes(incidentType)) {
      score += 25;
    }

    return score;
  }

  /**
   * Calculate hospital capacity score
   */
  calculateCapacityScore(hospital) {
    const utilizationRate = (hospital.current_load || 0) / hospital.capacity;
    
    // Prefer hospitals with lower utilization
    if (utilizationRate < 0.6) return 20;
    if (utilizationRate < 0.8) return 15;
    if (utilizationRate < 0.9) return 10;
    return 0;
  }

  /**
   * Calculate age-specific preferences
   */
  calculateAgePreference(hospital, ageRange) {
    const specialties = hospital.specialties || [];
    
    if (ageRange === '0-10' && specialties.includes('Pediatrics')) {
      return 15; // Prefer pediatric facilities for children
    }
    
    if (ageRange === '51+' && specialties.includes('Geriatrics')) {
      return 10; // Slight preference for geriatric care
    }
    
    return 0;
  }

  /**
   * Calculate regional preferences for Jamaica
   */
  calculateRegionalPreference(hospital, reportData) {
    const { latitude, longitude } = reportData;
    
    // Kingston Metropolitan Area preference (most comprehensive care)
    if (this.isInKingstonArea(latitude, longitude)) {
      if (hospital.name.toLowerCase().includes('kingston') || 
          hospital.name.toLowerCase().includes('university')) {
        return 10;
      }
    }

    // Spanish Town area
    if (this.isInSpanishTownArea(latitude, longitude)) {
      if (hospital.name.toLowerCase().includes('spanish town')) {
        return 15; // Local hospital bonus
      }
    }

    // Rural area considerations
    if (this.isRuralArea(latitude, longitude)) {
      // Prefer larger hospitals for rural patients
      if (hospital.capacity > 150) {
        return 10;
      }
    }

    return 0;
  }

  /**
   * Geographic area helpers for Jamaica
   */
  isInKingstonArea(lat, lng) {
    // Kingston Metropolitan Area bounds
    return lat >= 17.9 && lat <= 18.1 && lng >= -76.9 && lng <= -76.7;
  }

  isInSpanishTownArea(lat, lng) {
    // Spanish Town area bounds
    return lat >= 17.95 && lat <= 18.0 && lng >= -77.0 && lng <= -76.9;
  }

  isRuralArea(lat, lng) {
    // Consider areas outside major urban centers as rural
    return !this.isInKingstonArea(lat, lng) && !this.isInSpanishTownArea(lat, lng);
  }

  /**
   * Generate human-readable selection reason
   */
  generateSelectionReason(hospital, reportData) {
    const reasons = [];
    
    if (hospital.distance < 10) {
      reasons.push('closest available hospital');
    }
    
    if (hospital.travelTime < 15) {
      reasons.push('fastest travel time');
    }

    const specialties = hospital.specialties || [];
    if (specialties.includes('Trauma') && 
        ['shooting', 'stabbing', 'motor-vehicle-accident'].includes(reportData.incident_type)) {
      reasons.push('specialized trauma care available');
    }

    if (specialties.includes('ICU') && reportData.criticality === 'severe') {
      reasons.push('intensive care unit available');
    }

    if (reasons.length === 0) {
      reasons.push('best overall match for patient needs');
    }

    return `Selected for ${reasons.join(', ')}.`;
  }

  /**
   * Get hospital by coordinates for emergency services
   */
  async getHospitalByLocation(latitude, longitude, radius = 50) {
    const nearbyHospitals = this.jamaicaHospitals
      .map(hospital => ({
        ...hospital,
        distance: this.calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude)
      }))
      .filter(hospital => hospital.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return nearbyHospitals;
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
      total_hospitals: this.jamaicaHospitals.length,
      hospital_coverage: {
        kingston_area: this.jamaicaHospitals.filter(h => 
          this.isInKingstonArea(h.latitude, h.longitude)).length,
        spanish_town_area: this.jamaicaHospitals.filter(h => 
          this.isInSpanishTownArea(h.latitude, h.longitude)).length,
        rural_areas: this.jamaicaHospitals.filter(h => 
          this.isRuralArea(h.latitude, h.longitude)).length
      },
      specialty_coverage: this.getSpecialtyCoverage()
    };
  }

  getSpecialtyCoverage() {
    const specialties = {};
    this.jamaicaHospitals.forEach(hospital => {
      (hospital.specialties || []).forEach(specialty => {
        specialties[specialty] = (specialties[specialty] || 0) + 1;
      });
    });
    return specialties;
  }
}

// Create singleton instance
export const hospitalSelector = new HospitalSelector();

// Export utility functions
export const selectNearestHospital = (reportData) => 
  hospitalSelector.selectNearestHospital(reportData);

export const getHospitalByLocation = (latitude, longitude, radius) => 
  hospitalSelector.getHospitalByLocation(latitude, longitude, radius);