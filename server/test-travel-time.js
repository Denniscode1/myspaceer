import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  initializeEnhancedDatabase, 
  createPatientReport, 
  getPatientReports,
  saveTravelEstimate,
  getTravelEstimate
} from './database-enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTravelTimeFeatures() {
  console.log('🧪 Testing Travel Time Features\n');

  try {
    // Initialize database
    await initializeEnhancedDatabase();
    console.log('✅ Database initialized');

    // Create a test patient report
    const testPatientData = {
      name: 'John Travel Test',
      gender: 'male',
      age_range: '30-40',
      incident_type: 'chest_pain',
      patient_status: 'conscious',
      transportation_mode: 'ambulance',
      latitude: 18.0179,
      longitude: -76.8099,
      contact_email: 'john.test@example.com'
    };

    const patientReport = await createPatientReport(testPatientData);
    console.log(`✅ Test patient report created: ${patientReport.report_id}`);

    // Save some travel estimates for different hospitals
    const travelEstimates = [
      {
        hospitalId: 'HOSP001',
        duration: 900,  // 15 minutes
        distance: 8000, // 8km
        trafficFactor: 1.2,
        provider: 'test_osrm'
      },
      {
        hospitalId: 'HOSP002', 
        duration: 1500, // 25 minutes
        distance: 15000, // 15km
        trafficFactor: 1.4,
        provider: 'test_osrm'
      }
    ];

    for (const estimate of travelEstimates) {
      await saveTravelEstimate(
        patientReport.report_id,
        estimate.hospitalId,
        estimate.duration,
        estimate.distance,
        estimate.trafficFactor,
        estimate.provider
      );
      console.log(`✅ Travel estimate saved for hospital ${estimate.hospitalId}: ${Math.round(estimate.duration/60)} minutes`);
    }

    // Retrieve travel estimates
    console.log('\n📊 Retrieving travel estimates:');
    
    for (const estimate of travelEstimates) {
      const savedEstimate = await getTravelEstimate(patientReport.report_id, estimate.hospitalId);
      if (savedEstimate) {
        console.log(`  Hospital ${estimate.hospitalId}: ${Math.round(savedEstimate.estimated_time_seconds/60)} min, ${Math.round(savedEstimate.distance_meters/1000)} km`);
      }
    }

    // Test getting patient reports with travel time data
    console.log('\n📋 Testing patient reports with travel data:');
    const reportsWithTravel = await getPatientReports({ report_id: patientReport.report_id });
    
    if (reportsWithTravel.length > 0) {
      const report = reportsWithTravel[0];
      console.log(`  Report ID: ${report.report_id}`);
      console.log(`  Travel Time: ${report.travel_time_minutes ? report.travel_time_minutes + ' min' : 'Not available'}`);
      console.log(`  Travel Distance: ${report.travel_distance_km ? report.travel_distance_km + ' km' : 'Not available'}`);
      console.log(`  Traffic Factor: ${report.traffic_factor || 'Not available'}`);
      console.log(`  Routing Provider: ${report.routing_provider || 'Not available'}`);
    }

    console.log('\n🎉 Travel time testing completed successfully!');
    
    // Instructions for frontend integration
    console.log('\n📝 Frontend Integration Guide:');
    console.log('1. Travel time data is now included in all patient report responses');
    console.log('2. Look for these fields in your API responses:');
    console.log('   - travel_time_seconds: Raw seconds');
    console.log('   - travel_time_minutes: Computed minutes');
    console.log('   - travel_distance_meters: Raw meters');  
    console.log('   - travel_distance_km: Computed kilometers');
    console.log('   - traffic_factor: Traffic multiplier');
    console.log('   - routing_provider: Which service calculated the route');
    console.log('\n3. New API endpoints available:');
    console.log('   GET /api/reports/:reportId/travel-time - Get detailed travel info');
    console.log('   GET /api/reports - Now includes travel time in all responses');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTravelTimeFeatures();