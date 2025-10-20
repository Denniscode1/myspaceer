import { hospitalSelector } from './services/hospitalSelector.js';
import { travelTimeService } from './services/travelTimeService.js';

/**
 * Test closest hospital selection functionality
 */
async function testClosestHospitalSelection() {
  console.log('🏥 Testing Closest Hospital Selection...\n');

  // Test locations across Jamaica
  const testLocations = [
    {
      name: 'Kingston (New Kingston area)',
      latitude: 18.0179,
      longitude: -76.8099,
      expected_area: 'Kingston'
    },
    {
      name: 'Montego Bay',
      latitude: 18.4762,
      longitude: -77.8934,
      expected_area: 'Montego Bay'
    },
    {
      name: 'Mandeville',
      latitude: 18.0425,
      longitude: -77.5044,
      expected_area: 'Mandeville'
    },
    {
      name: 'Ocho Rios (St. Ann)',
      latitude: 18.4078,
      longitude: -77.1038,
      expected_area: 'St. Ann'
    },
    {
      name: 'Spanish Town',
      latitude: 17.9909,
      longitude: -76.9573,
      expected_area: 'Spanish Town'
    }
  ];

  // Wait for hospital selector to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  for (const location of testLocations) {
    console.log(`📍 Testing location: ${location.name}`);
    console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
    
    try {
      // Test basic hospital selector
      const reportData = {
        report_id: `test_${Date.now()}`,
        latitude: location.latitude,
        longitude: location.longitude,
        transportation_mode: 'self-carry'
      };

      const result = await hospitalSelector.selectNearestHospital(reportData);
      
      if (result && result.selected_hospital) {
        console.log(`✅ Closest Hospital: ${result.selected_hospital.name}`);
        console.log(`   Distance: ${result.selected_hospital.distance.toFixed(2)} km`);
        console.log(`   Travel Time: ${result.selected_hospital.travelTime} minutes`);
        console.log(`   Reason: ${result.selection_reason}`);
        
        // Test travel time service
        console.log('   Testing travel time service...');
        try {
          const travelResult = await travelTimeService.processHospitalSelection(reportData);
          if (travelResult && travelResult.selected_hospital) {
            console.log(`   ✅ Travel Time Service: ${travelResult.selected_hospital.hospital_name}`);
            console.log(`   ETA: ${Math.round(travelResult.selected_hospital.route_info.duration_seconds / 60)} minutes`);
            console.log(`   Route Provider: ${travelResult.selected_hospital.route_info.provider}`);
          }
        } catch (travelError) {
          console.log(`   ⚠️ Travel time service failed: ${travelError.message}`);
        }
        
      } else {
        console.log('❌ No hospital selected');
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${location.name}: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Test edge cases
  console.log('🧪 Testing Edge Cases...\n');
  
  // Test with missing coordinates
  try {
    await hospitalSelector.selectNearestHospital({
      report_id: 'test_missing_coords',
      latitude: null,
      longitude: null
    });
  } catch (error) {
    console.log('✅ Correctly handled missing coordinates:', error.message);
  }
  
  // Test with coordinates outside Jamaica
  try {
    const outsideJamaica = {
      report_id: 'test_outside_jamaica',
      latitude: 25.7617, // Miami, Florida
      longitude: -80.1918,
      transportation_mode: 'self-carry'
    };
    
    const result = await hospitalSelector.selectNearestHospital(outsideJamaica);
    if (result) {
      console.log(`✅ Handled location outside Jamaica: ${result.selected_hospital.name}`);
      console.log(`   Distance: ${result.selected_hospital.distance.toFixed(2)} km (very far as expected)`);
    }
  } catch (error) {
    console.log('⚠️ Error with outside location:', error.message);
  }

  console.log('\n🏁 Hospital selection test completed!');
}

// Test hospital statistics
async function testHospitalStats() {
  console.log('\n📊 Hospital Selector Statistics:');
  
  try {
    const stats = hospitalSelector.getServiceStats();
    console.log(`   Total hospitals: ${stats.total_hospitals}`);
    console.log(`   Kingston area hospitals: ${stats.hospital_coverage.kingston_area}`);
    console.log(`   Spanish Town area hospitals: ${stats.hospital_coverage.spanish_town_area}`);
    console.log(`   Rural area hospitals: ${stats.hospital_coverage.rural_areas}`);
    console.log('\n   Available specialties:');
    Object.entries(stats.specialty_coverage).forEach(([specialty, count]) => {
      console.log(`     ${specialty}: ${count} hospitals`);
    });
  } catch (error) {
    console.log('❌ Error getting stats:', error.message);
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting Hospital Selection Tests\n');
  console.log('=' .repeat(50));
  
  try {
    await testClosestHospitalSelection();
    await testHospitalStats();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testClosestHospitalSelection, testHospitalStats };