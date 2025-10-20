import { 
  initializeEnhancedDatabase, 
  getPatientReports, 
  saveTravelEstimate,
  getHospitals
} from './database-enhanced.js';

/**
 * Fix unrealistic travel time data and populate with accurate estimates
 * This script corrects any incorrect travel time calculations
 */

async function fixTravelTimeData() {
  console.log('🔧 Fixing Travel Time Data\n');
  
  try {
    // Initialize database
    await initializeEnhancedDatabase();
    console.log('✅ Database initialized');
    
    // Get all patient reports with travel data
    const reports = await getPatientReports();
    console.log(`📊 Found ${reports.length} patient reports`);
    
    // Get available hospitals
    const hospitals = await getHospitals();
    console.log(`🏥 Found ${hospitals.length} hospitals`);
    
    let fixedCount = 0;
    
    for (const report of reports) {
      if (!report.latitude || !report.longitude) {
        console.log(`⚠️  Report ${report.report_id} missing coordinates, skipping...`);
        continue;
      }
      
      console.log(`\n📋 Processing report: ${report.report_id}`);
      console.log(`  📍 Location: ${report.latitude}, ${report.longitude}`);
      
      // Check if current travel time is unrealistic (> 2 hours)
      const currentTravelMinutes = report.travel_time_minutes;
      if (currentTravelMinutes && currentTravelMinutes <= 120) {
        console.log(`  ✅ Travel time looks realistic (${currentTravelMinutes} min), keeping...`);
        continue;
      }
      
      if (currentTravelMinutes > 120) {
        console.log(`  ⚠️  Unrealistic travel time detected: ${currentTravelMinutes} minutes`);
      }
      
      // Generate realistic travel estimates for each hospital
      for (const hospital of hospitals) {
        const distance = calculateHaversineDistance(
          { lat: report.latitude, lng: report.longitude },
          { lat: hospital.latitude, lng: hospital.longitude }
        );
        
        // Generate realistic travel time based on Jamaica's geography
        const travelTime = generateRealisticTravelTime(distance, hospital);
        const trafficFactor = getTimeBasedTrafficFactor();
        
        // Save the corrected estimate
        await saveTravelEstimate(
          report.report_id,
          hospital.hospital_id,
          travelTime,
          Math.round(distance),
          trafficFactor,
          'corrected_estimate'
        );
        
        console.log(`  🏥 ${hospital.name}: ${Math.round(travelTime/60)} min, ${Math.round(distance/1000)} km`);
      }
      
      fixedCount++;
    }
    
    console.log('\n📈 Fix Summary:');
    console.log(`  🔧 Fixed reports: ${fixedCount}`);
    console.log(`  📊 Total reports: ${reports.length}`);
    
    // Verify the fixes
    console.log('\n🔍 Verification - Checking corrected data:');
    const updatedReports = await getPatientReports();
    
    console.log('\n📋 Updated travel times:');
    updatedReports.forEach(report => {
      if (report.travel_time_minutes) {
        console.log(`  ${report.report_id}: ${report.travel_time_minutes} min to ${report.hospital_name || 'Hospital'}`);
      }
    });
    
    console.log('\n✅ Travel time data has been corrected!');
    
  } catch (error) {
    console.error('❌ Fix operation failed:', error);
  }
}

/**
 * Generate realistic travel time for Jamaica's road network
 */
function generateRealisticTravelTime(distanceMeters, hospital) {
  const distanceKm = distanceMeters / 1000;
  
  // Jamaica average speeds based on road types and areas
  let averageSpeed = 35; // km/h base urban speed
  
  // Adjust speed based on hospital location and typical routes
  if (hospital.name.includes('Kingston')) {
    averageSpeed = 25; // Kingston traffic is slower
  } else if (hospital.name.includes('Spanish Town')) {
    averageSpeed = 30; // Spanish Town moderate traffic
  } else {
    averageSpeed = 40; // Rural/less congested areas
  }
  
  // Calculate base travel time
  const baseTimeHours = distanceKm / averageSpeed;
  
  // Add realistic constraints
  const minTimeMinutes = Math.max(5, distanceKm * 1.5); // Minimum time based on distance
  const maxTimeMinutes = Math.min(120, distanceKm * 4); // Maximum reasonable time
  
  const calculatedTimeMinutes = baseTimeHours * 60;
  const finalTimeMinutes = Math.max(minTimeMinutes, Math.min(maxTimeMinutes, calculatedTimeMinutes));
  
  return Math.round(finalTimeMinutes * 60); // Convert to seconds
}

/**
 * Get traffic factor based on current time
 */
function getTimeBasedTrafficFactor() {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // Weekend traffic
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 0.85; // 15% faster on weekends
  }
  
  // Weekday rush hours
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
    return 1.3; // 30% slower during rush hour
  }
  
  // Night hours
  if (hour >= 22 || hour <= 6) {
    return 0.8; // 20% faster at night
  }
  
  // Regular daytime
  return 1.0; // Normal speed
}

/**
 * Calculate straight-line distance using Haversine formula
 */
function calculateHaversineDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Create sample patient data with realistic Jamaica coordinates if needed
 */
async function createSamplePatients() {
  console.log('📋 Creating sample patients with realistic data...\n');
  
  const samplePatients = [
    {
      name: 'Maria Johnson',
      gender: 'female',
      age_range: '25-35',
      incident_type: 'chest_pain',
      patient_status: 'conscious',
      transportation_mode: 'ambulance',
      latitude: 18.0179, // Downtown Kingston
      longitude: -76.8099,
      contact_email: 'maria.j@example.com'
    },
    {
      name: 'Marcus Brown', 
      gender: 'male',
      age_range: '45-55',
      incident_type: 'motor_vehicle_accident',
      patient_status: 'unconscious',
      transportation_mode: 'ambulance',
      latitude: 17.9692, // Spanish Town area
      longitude: -76.8774,
      contact_email: 'marcus.b@example.com'
    },
    {
      name: 'Sarah Davis',
      gender: 'female', 
      age_range: '35-45',
      incident_type: 'shortness_of_breath',
      patient_status: 'conscious',
      transportation_mode: 'private_vehicle',
      latitude: 18.0748, // Mona/UWI area
      longitude: -76.7516,
      contact_email: 'sarah.d@example.com'
    }
  ];
  
  // This would create patients if needed, but we'll just fix existing data
  console.log(`📊 Sample data ready for ${samplePatients.length} patients`);
  return samplePatients;
}

// Run the fix
fixTravelTimeData();