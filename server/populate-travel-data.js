import { 
  initializeEnhancedDatabase, 
  getPatientReports, 
  saveTravelEstimate,
  getHospitals
} from './database-enhanced.js';
import { travelTimeService } from './services/travelTimeService.js';

/**
 * Populate missing travel time data for patient records
 * This script will analyze existing patient reports and generate realistic travel time estimates
 */

async function populateMissingTravelData() {
  console.log('🚀 Starting Travel Data Population\n');
  
  try {
    // Initialize database
    await initializeEnhancedDatabase();
    console.log('✅ Database initialized');
    
    // Get all patient reports
    const reports = await getPatientReports();
    console.log(`📊 Found ${reports.length} patient reports`);
    
    // Get available hospitals
    const hospitals = await getHospitals();
    console.log(`🏥 Found ${hospitals.length} hospitals`);
    
    let populatedCount = 0;
    let skippedCount = 0;
    
    for (const report of reports) {
      console.log(`\n📋 Processing report: ${report.report_id}`);
      
      // Skip if travel time data already exists
      if (report.travel_time_seconds) {
        console.log('  ⏭️  Travel data already exists, skipping...');
        skippedCount++;
        continue;
      }
      
      // Skip if location data is missing
      if (!report.latitude || !report.longitude) {
        console.log('  ⚠️  Missing location coordinates, skipping...');
        skippedCount++;
        continue;
      }
      
      try {
        // Generate travel time estimates for this report
        const reportData = {
          report_id: report.report_id,
          latitude: report.latitude,
          longitude: report.longitude,
          criticality: report.criticality || 'moderate'
        };
        
        console.log(`  📍 Patient location: ${report.latitude}, ${report.longitude}`);
        
        // Use the travel time service to calculate routes to all hospitals
        const hospitalSelection = await travelTimeService.processHospitalSelection(reportData);
        
        if (hospitalSelection.selected_hospital) {
          console.log(`  ✅ Generated travel estimates for ${hospitalSelection.all_options.length} hospitals`);
          console.log(`  🎯 Best hospital: ${hospitalSelection.selected_hospital.hospital_name}`);
          console.log(`  ⏱️  Travel time: ${Math.round(hospitalSelection.selected_hospital.route_info.duration_seconds / 60)} minutes`);
          populatedCount++;
        } else {
          console.log('  ❌ Failed to generate travel estimates');
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing report ${report.report_id}:`, error.message);
      }
    }
    
    console.log('\n📈 Population Summary:');
    console.log(`  ✅ Successfully populated: ${populatedCount} reports`);
    console.log(`  ⏭️  Skipped: ${skippedCount} reports`);
    console.log(`  📊 Total processed: ${reports.length} reports`);
    
    // Verify the population by checking updated data
    console.log('\n🔍 Verification - Checking updated data:');
    const updatedReports = await getPatientReports();
    const reportsWithTravelData = updatedReports.filter(r => r.travel_time_seconds);
    
    console.log(`📊 Reports with travel data: ${reportsWithTravelData.length}/${updatedReports.length}`);
    
    if (reportsWithTravelData.length > 0) {
      console.log('\n📋 Sample of populated data:');
      reportsWithTravelData.slice(0, 3).forEach(report => {
        console.log(`  Report ${report.report_id}:`);
        console.log(`    Travel Time: ${report.travel_time_minutes} minutes`);
        console.log(`    Distance: ${report.travel_distance_km} km`);
        console.log(`    Hospital: ${report.hospital_name || 'Not assigned'}`);
        console.log(`    Traffic Factor: ${report.traffic_factor}`);
        console.log(`    Provider: ${report.routing_provider}`);
      });
    }
    
    console.log('\n🎉 Travel data population completed successfully!');
    
  } catch (error) {
    console.error('❌ Travel data population failed:', error);
  }
}

/**
 * Alternative function to generate synthetic travel data for testing
 * Use this if the real routing service is not available
 */
async function generateSyntheticTravelData() {
  console.log('🧪 Generating Synthetic Travel Data\n');
  
  try {
    await initializeEnhancedDatabase();
    
    const reports = await getPatientReports();
    const hospitals = await getHospitals();
    
    console.log(`📊 Processing ${reports.length} reports with synthetic data`);
    
    for (const report of reports) {
      if (report.travel_time_seconds || !report.latitude || !report.longitude) {
        continue;
      }
      
      console.log(`📋 Generating synthetic data for: ${report.report_id}`);
      
      // Generate realistic synthetic travel estimates for each hospital
      for (const hospital of hospitals.slice(0, 3)) { // Top 3 hospitals
        // Calculate straight-line distance
        const distance = calculateHaversineDistance(
          { lat: report.latitude, lng: report.longitude },
          { lat: hospital.latitude, lng: hospital.longitude }
        );
        
        // Generate realistic travel time based on distance and conditions
        const baseSpeed = 35; // km/h average urban speed
        const trafficFactor = getRandomTrafficFactor();
        const travelTimeHours = (distance / 1000) / baseSpeed * trafficFactor;
        const travelTimeSeconds = Math.round(travelTimeHours * 3600);
        
        // Add some randomness to make it more realistic
        const variation = 0.8 + (Math.random() * 0.4); // ±20% variation
        const finalTravelTime = Math.round(travelTimeSeconds * variation);
        
        // Save the synthetic estimate
        await saveTravelEstimate(
          report.report_id,
          hospital.hospital_id,
          finalTravelTime,
          Math.round(distance),
          trafficFactor,
          'synthetic'
        );
        
        console.log(`  🏥 ${hospital.name}: ${Math.round(finalTravelTime/60)} min, ${Math.round(distance/1000)} km`);
      }
    }
    
    console.log('\n✅ Synthetic travel data generation completed!');
    
  } catch (error) {
    console.error('❌ Synthetic data generation failed:', error);
  }
}

// Helper functions
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

function getRandomTrafficFactor() {
  const hour = new Date().getHours();
  const baseFactors = [1.0, 1.1, 1.2, 1.3, 1.4];
  
  // Rush hour gets higher factors
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return baseFactors[Math.floor(Math.random() * 2) + 3]; // 1.3-1.4
  }
  
  // Night gets lower factors  
  if (hour >= 22 || hour <= 6) {
    return baseFactors[Math.floor(Math.random() * 2)]; // 1.0-1.1
  }
  
  // Regular hours
  return baseFactors[Math.floor(Math.random() * 3) + 1]; // 1.1-1.3
}

// Command line argument handling
const args = process.argv.slice(2);
const useReal = args.includes('--real');
const useSynthetic = args.includes('--synthetic');

if (useSynthetic) {
  generateSyntheticTravelData();
} else {
  populateMissingTravelData();
}

export { populateMissingTravelData, generateSyntheticTravelData };