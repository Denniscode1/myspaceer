import { getHospitals, logEvent, saveTravelEstimate } from '../database-enhanced.js';

/**
 * Travel Time and Hospital Selection Service
 * Integrates with routing APIs for ETA calculations and hospital scoring
 */
export class TravelTimeService {
  constructor() {
    this.routingProvider = 'osrm'; // Can be 'osrm', 'google', 'here'
    this.osrmServer = 'http://router.project-osrm.org'; // Public OSRM server
    this.maxHospitals = 5; // Consider top N hospitals
    this.cache = new Map(); // Simple cache for routing results
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Calculate travel times and select best hospital
   */
  async processHospitalSelection(reportData) {
    const startTime = Date.now();
    
    try {
      const { report_id, latitude, longitude, criticality } = reportData;
      
      if (!latitude || !longitude) {
        throw new Error('Patient location coordinates required');
      }

      // Get available hospitals
      const hospitals = await getHospitals();
      
      // Calculate distances and travel times
      const hospitalRoutes = await Promise.allSettled(
        hospitals.map(hospital => this.calculateRoute(
          { lat: latitude, lng: longitude },
          { lat: hospital.latitude, lng: hospital.longitude },
          hospital
        ))
      );

      // Process successful routes
      const validRoutes = hospitalRoutes
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(route => route !== null);

      if (validRoutes.length === 0) {
        throw new Error('No valid routes found to any hospital');
      }

      // Sort by travel time only (fastest first)
      const sortedHospitals = validRoutes.sort((a, b) => a.duration_seconds - b.duration_seconds);
      
      // Select closest hospital by travel time
      const closestHospital = sortedHospitals[0];

      // Save travel estimate for closest hospital only
      try {
        await saveTravelEstimate(
          report_id,
          closestHospital.hospital.hospital_id,
          closestHospital.duration_seconds,
          closestHospital.distance_meters,
          closestHospital.traffic_factor,
          closestHospital.provider
        );
        console.log(`Travel estimate saved for closest hospital for report ${report_id}`);
      } catch (saveError) {
        console.warn(`Failed to save travel estimate for ${report_id}:`, saveError);
      }

      const processingTime = Date.now() - startTime;
      
      logEvent('hospital_selection_completed', 'travel_estimate', report_id, null, null, {
        processing_time_ms: processingTime,
        hospitals_considered: hospitals.length,
        valid_routes: validRoutes.length,
        selected_hospital: closestHospital.hospital.hospital_id,
        travel_time_seconds: closestHospital.duration_seconds,
        selection_method: 'closest_travel_time'
      });

      return {
        selected_hospital: {
          hospital_id: closestHospital.hospital.hospital_id,
          hospital_name: closestHospital.hospital.name,
          route_info: {
            duration_seconds: closestHospital.duration_seconds,
            distance_meters: closestHospital.distance_meters,
            provider: closestHospital.provider,
            traffic_factor: closestHospital.traffic_factor
          },
          recommendation_reason: `Closest hospital by travel time (${Math.round(closestHospital.duration_seconds / 60)} minutes)`
        },
        processing_time_ms: processingTime
      };

    } catch (error) {
      console.error('Hospital selection failed:', error);
      
      // Fallback to nearest hospital by straight-line distance
      return await this.getFallbackHospital(reportData);
    }
  }

  /**
   * Calculate route using selected routing provider
   */
  async calculateRoute(origin, destination, hospital) {
    const cacheKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return { ...cached.data, hospital };
      }
    }

    try {
      let routeData;
      
      switch (this.routingProvider) {
        case 'osrm':
          routeData = await this.calculateOSRMRoute(origin, destination);
          break;
        case 'google':
          routeData = await this.calculateGoogleRoute(origin, destination);
          break;
        default:
          routeData = await this.calculateStraightLineRoute(origin, destination);
      }

      if (routeData) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: routeData,
          timestamp: Date.now()
        });

        return { ...routeData, hospital };
      }

      return null;

    } catch (error) {
      console.error(`Route calculation failed for ${hospital.name}:`, error);
      
      // Fallback to straight-line calculation
      return this.calculateStraightLineRoute(origin, destination, hospital);
    }
  }

  /**
   * Calculate route using OSRM (Open Source Routing Machine)
   */
  async calculateOSRMRoute(origin, destination) {
    const url = `${this.osrmServer}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&alternatives=false`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    
    return {
      duration_seconds: Math.round(route.duration),
      distance_meters: Math.round(route.distance),
      provider: 'osrm',
      traffic_factor: 1.0, // OSRM doesn't provide live traffic
      confidence: 0.8
    };
  }

  /**
   * Calculate route using Google Maps API (requires API key)
   */
  async calculateGoogleRoute(origin, destination) {
    // This would require Google Maps API key
    // For demo purposes, we'll simulate the response
    const straightLine = this.calculateStraightLineRoute(origin, destination);
    
    // Apply traffic factor (Google provides live traffic)
    const trafficFactor = this.estimateTrafficFactor();
    
    return {
      duration_seconds: Math.round(straightLine.duration_seconds * trafficFactor),
      distance_meters: straightLine.distance_meters,
      provider: 'google',
      traffic_factor: trafficFactor,
      confidence: 0.95
    };
  }

  /**
   * Fallback straight-line calculation with speed estimates
   */
  calculateStraightLineRoute(origin, destination, hospital = null) {
    const distance = this.calculateHaversineDistance(origin, destination);
    
    // Estimate driving time based on road type and traffic
    const averageSpeed = this.estimateAverageSpeed();
    const duration = (distance / averageSpeed) * 3600; // Convert to seconds

    return {
      duration_seconds: Math.round(duration),
      distance_meters: Math.round(distance),
      provider: 'straight_line',
      traffic_factor: 1.2, // Conservative estimate
      confidence: 0.6,
      hospital
    };
  }

  /**
   * Calculate straight-line distance using Haversine formula
   */
  calculateHaversineDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Score hospitals based on multiple factors
   */
  scoreHospitals(routes, criticality) {
    return routes
      .map(route => this.calculateHospitalScore(route, criticality))
      .sort((a, b) => b.total_score - a.total_score);
  }

  /**
   * Calculate comprehensive hospital score
   */
  calculateHospitalScore(route, criticality) {
    const hospital = route.hospital;
    
    // Scoring factors
    const factors = {
      // Travel time (inverse scoring - shorter is better)
      travel_time_score: this.calculateTravelTimeScore(route.duration_seconds),
      
      // Hospital capacity and load
      capacity_score: this.calculateCapacityScore(hospital),
      
      // Specialty match for incident type
      specialty_score: this.calculateSpecialtyScore(hospital, criticality),
      
      // Hospital quality/reputation (simulated)
      quality_score: this.calculateQualityScore(hospital),
      
      // Distance penalty for very far hospitals
      distance_penalty: this.calculateDistancePenalty(route.distance_meters)
    };

    // Weighted scoring based on criticality
    const weights = this.getCriticalityWeights(criticality);
    
    let totalScore = 0;
    for (const [factor, score] of Object.entries(factors)) {
      totalScore += (weights[factor] || 0.2) * score;
    }

    return {
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.name,
      total_score: Math.round(totalScore * 100) / 100,
      factors,
      route_info: {
        duration_seconds: route.duration_seconds,
        distance_meters: route.distance_meters,
        provider: route.provider,
        traffic_factor: route.traffic_factor
      },
      recommendation_reason: this.generateRecommendationReason(factors, weights)
    };
  }

  calculateTravelTimeScore(durationSeconds) {
    // Score inversely related to travel time
    // 5 minutes = 10 points, 30 minutes = 1 point
    const minutes = durationSeconds / 60;
    return Math.max(1, 11 - (minutes / 3));
  }

  calculateCapacityScore(hospital) {
    const utilizationRate = hospital.current_load / hospital.capacity;
    
    if (utilizationRate < 0.6) return 10; // Low utilization
    if (utilizationRate < 0.8) return 7;  // Medium utilization
    if (utilizationRate < 0.95) return 4; // High utilization
    return 1; // Over capacity
  }

  calculateSpecialtyScore(hospital, criticality) {
    const specialties = hospital.specialties || [];
    
    // Match specialties to criticality needs
    const criticalityNeeds = {
      'severe': ['Emergency', 'Trauma', 'Surgery', 'ICU'],
      'high': ['Emergency', 'Trauma', 'Surgery'],
      'moderate': ['Emergency', 'General Medicine'],
      'low': ['Emergency']
    };

    const neededSpecialties = criticalityNeeds[criticality] || ['Emergency'];
    const matchedSpecialties = neededSpecialties.filter(need => 
      specialties.some(spec => spec.toLowerCase().includes(need.toLowerCase()))
    );

    return (matchedSpecialties.length / neededSpecialties.length) * 10;
  }

  calculateQualityScore(hospital) {
    // Simulated quality scoring based on hospital characteristics
    // In production, this would use real quality metrics
    const qualityFactors = {
      'Kingston Public Hospital': 8,
      'University Hospital of the West Indies': 10,
      'Spanish Town Hospital': 7
    };

    return qualityFactors[hospital.name] || 6;
  }

  calculateDistancePenalty(distanceMeters) {
    // No penalty under 10km, increasing penalty after that
    const km = distanceMeters / 1000;
    if (km <= 10) return 0;
    return Math.min(5, (km - 10) * 0.5); // Max 5 point penalty
  }

  getCriticalityWeights(criticality) {
    const weightMaps = {
      'severe': {
        travel_time_score: 0.4,   // Time is critical
        specialty_score: 0.3,    // Need right specialists
        capacity_score: 0.2,     // Capacity important but secondary
        quality_score: 0.1,      // Quality less important when urgent
        distance_penalty: 0.0    // Ignore distance for severe cases
      },
      'high': {
        travel_time_score: 0.35,
        specialty_score: 0.25,
        capacity_score: 0.25,
        quality_score: 0.15,
        distance_penalty: 0.0
      },
      'moderate': {
        travel_time_score: 0.25,
        specialty_score: 0.2,
        capacity_score: 0.3,
        quality_score: 0.2,
        distance_penalty: 0.05
      },
      'low': {
        travel_time_score: 0.2,
        specialty_score: 0.15,
        capacity_score: 0.35,
        quality_score: 0.25,
        distance_penalty: 0.05
      }
    };

    return weightMaps[criticality] || weightMaps['moderate'];
  }

  generateRecommendationReason(factors, weights) {
    // Find the top contributing factors
    const weightedFactors = Object.entries(factors)
      .map(([factor, score]) => ({
        factor,
        weighted_score: score * (weights[factor] || 0.2)
      }))
      .sort((a, b) => b.weighted_score - a.weighted_score);

    const topFactor = weightedFactors[0];
    const factorNames = {
      travel_time_score: 'shortest travel time',
      specialty_score: 'best specialty match',
      capacity_score: 'available capacity',
      quality_score: 'high quality rating',
      distance_penalty: 'proximity'
    };

    return `Selected primarily for ${factorNames[topFactor.factor] || topFactor.factor}`;
  }

  /**
   * Estimate traffic factor based on time of day
   */
  estimateTrafficFactor() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend traffic is generally lighter
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.9;
    }

    // Rush hour traffic
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.4; // 40% longer due to traffic
    }

    // Night hours - lighter traffic
    if (hour >= 22 || hour <= 6) {
      return 0.8;
    }

    // Regular daytime traffic
    return 1.1;
  }

  /**
   * Estimate average driving speed
   */
  estimateAverageSpeed() {
    // Average speed in km/h considering urban driving conditions
    const hour = new Date().getHours();
    
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 25; // Rush hour speed
    }
    
    if (hour >= 22 || hour <= 6) {
      return 45; // Night speed
    }
    
    return 35; // Regular speed
  }

  /**
   * Fallback hospital selection when routing fails
   */
  async getFallbackHospital(reportData) {
    try {
      const { report_id, latitude, longitude } = reportData;
      const hospitals = await getHospitals();

      // Select nearest hospital by straight-line distance
      let nearestHospital = null;
      let shortestDistance = Infinity;

      for (const hospital of hospitals) {
        const distance = this.calculateHaversineDistance(
          { lat: latitude, lng: longitude },
          { lat: hospital.latitude, lng: hospital.longitude }
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestHospital = hospital;
        }
      }

      if (!nearestHospital) {
        throw new Error('No hospitals available');
      }

      const estimatedTime = (shortestDistance / 1000) / 35 * 3600; // 35 km/h average

      logEvent('fallback_hospital_selection', 'travel_estimate', report_id, null, null, {
        selected_hospital: nearestHospital.hospital_id,
        distance_meters: shortestDistance,
        method: 'nearest_straight_line'
      });

      return {
        selected_hospital: {
          hospital_id: nearestHospital.hospital_id,
          hospital_name: nearestHospital.name,
          total_score: 5.0, // Default score for fallback
          route_info: {
            duration_seconds: Math.round(estimatedTime),
            distance_meters: Math.round(shortestDistance),
            provider: 'fallback',
            traffic_factor: 1.2
          },
          recommendation_reason: 'Nearest available hospital (fallback selection)'
        },
        all_options: [],
        processing_time_ms: 0,
        is_fallback: true
      };

    } catch (error) {
      console.error('Fallback hospital selection failed:', error);
      throw new Error('Unable to select any hospital');
    }
  }

  /**
   * Update travel time with live location data
   */
  async updateTravelTime(reportId, currentLatitude, currentLongitude, destinationHospital) {
    try {
      const currentRoute = await this.calculateRoute(
        { lat: currentLatitude, lng: currentLongitude },
        { lat: destinationHospital.latitude, lng: destinationHospital.longitude },
        destinationHospital
      );

      if (currentRoute) {
        logEvent('travel_time_updated', 'travel_estimate', reportId, null, null, {
          updated_eta_seconds: currentRoute.duration_seconds,
          current_location: { lat: currentLatitude, lng: currentLongitude }
        });

        return {
          updated_eta_seconds: currentRoute.duration_seconds,
          distance_remaining_meters: currentRoute.distance_meters,
          traffic_factor: currentRoute.traffic_factor
        };
      }

      return null;

    } catch (error) {
      console.error('Failed to update travel time:', error);
      return null;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      routing_provider: this.routingProvider,
      cache_size: this.cache.size,
      max_hospitals_considered: this.maxHospitals,
      cache_timeout_ms: this.cacheTimeout
    };
  }
}

// Create singleton instance
export const travelTimeService = new TravelTimeService();

// Export utility functions
export const selectHospital = (reportData) => travelTimeService.processHospitalSelection(reportData);
export const updateTravelTime = (reportId, lat, lng, hospital) => 
  travelTimeService.updateTravelTime(reportId, lat, lng, hospital);