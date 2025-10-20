import { hospitalSelector } from './services/hospitalSelector.js';

console.log('🏥 Testing Hospital Selection...\n');

// Wait a moment for initialization
setTimeout(async () => {
  try {
    // Test Kingston location
    const kingstonTest = {
      report_id: 'test_kingston_001',
      latitude: 18.0179,
      longitude: -76.8099,
      transportation_mode: 'self-carry'
    };

    console.log('📍 Testing Kingston location (18.0179, -76.8099)');
    
    const result = await hospitalSelector.selectNearestHospital(kingstonTest);
    
    if (result && result.selected_hospital) {
      console.log('✅ SUCCESS!');
      console.log(`Hospital: ${result.selected_hospital.name}`);
      console.log(`Distance: ${result.selected_hospital.distance.toFixed(2)} km`);
      console.log(`Travel Time: ${result.selected_hospital.travelTime} minutes`);
      console.log(`Selection Reason: ${result.selection_reason}`);
    } else {
      console.log('❌ No hospital found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}, 3000);