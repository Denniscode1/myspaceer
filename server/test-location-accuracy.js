import { enhancedHospitalSelection } from './enhanced-hospital-selection.js';

console.log('=== TESTING LOCATION ACCURACY FOR HOSPITAL SELECTION ===\n');

async function testLocationAccuracy() {
  try {
    // Test different locations across Jamaica to verify accuracy
    
    const testLocations = [
      {
        name: 'Downtown Kingston',
        latitude: 17.9714,
        longitude: -76.7931,
        expected_closest: 'Kingston Public Hospital'
      },
      {
        name: 'University of the West Indies (Mona)',
        latitude: 18.0061,
        longitude: -76.7466,
        expected_closest: 'University Hospital of the West Indies'
      },
      {
        name: 'Spanish Town Center',
        latitude: 17.9909,
        longitude: -76.9574,
        expected_closest: 'Spanish Town Hospital'
      },
      {
        name: 'Montego Bay (Cornwall Regional area)',
        latitude: 18.4750,
        longitude: -77.9264,
        expected_closest: 'Cornwall Regional Hospital'
      },
      {
        name: 'Portmore',
        latitude: 17.9527,
        longitude: -76.8847,
        expected_closest: 'Portmore Heart Academy & Hospital'
      },
      {
        name: 'Mandeville',
        latitude: 18.0420,
        longitude: -77.5028,
        expected_closest: 'Mandeville Regional Hospital'
      }
    ];

    console.log('🧪 Testing location accuracy for hospital selection...\n');
    
    for (const location of testLocations) {
      console.log(`📍 Testing: ${location.name}`);
      console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
      console.log(`   Expected closest: ${location.expected_closest}`);
      
      const result = await enhancedHospitalSelection.getHospitalsWithDistances({
        latitude: location.latitude,
        longitude: location.longitude,
        criticality: 'moderate',
        transportation_mode: 'self-carry'
      });
      
      if (result.success && result.data.length > 0) {
        const closestHospital = result.data[0];
        console.log(`   🏥 Actual closest: ${closestHospital.name}`);
        console.log(`   📏 Distance: ${closestHospital.distance_km}km`);
        console.log(`   ⏱ Travel time: ${closestHospital.travel_time_minutes} minutes`);
        console.log(`   🎯 Priority score: ${closestHospital.priority_score}`);
        
        // Check if the result matches expectation
        const matches = closestHospital.name === location.expected_closest;
        console.log(`   ${matches ? '✅ MATCH' : '❌ DIFFERENT'} (Expected: ${location.expected_closest})`);
        
        // Show top 3 hospitals
        console.log('   📋 Top 3 options:');
        result.data.slice(0, 3).forEach((hospital, index) => {
          console.log(`     ${index + 1}. ${hospital.name} - ${hospital.distance_km}km, ${hospital.travel_time_minutes}min`);
        });
        
      } else {
        console.log('   ❌ Failed to get hospitals for this location');
      }
      
      console.log(''); // Empty line for separation
    }
    
    // Test GPS accuracy simulation
    console.log('🎯 Testing GPS accuracy impact...\n');
    
    const baseLocation = {
      latitude: 17.9714,
      longitude: -76.7931
    };
    
    // Simulate different GPS accuracy levels
    const accuracyTests = [
      { offset: 0, accuracy: 5, desc: 'High accuracy GPS (±5m)' },
      { offset: 0.001, accuracy: 50, desc: 'Medium accuracy GPS (±50m, ~110m offset)' },
      { offset: 0.005, accuracy: 100, desc: 'Low accuracy GPS (±100m, ~550m offset)' }
    ];
    
    for (const test of accuracyTests) {
      console.log(`📡 ${test.desc}`);
      
      const testLocation = {
        latitude: baseLocation.latitude + test.offset,
        longitude: baseLocation.longitude + test.offset,
        accuracy: test.accuracy
      };
      
      const result = await enhancedHospitalSelection.getHospitalsWithDistances({
        ...testLocation,
        criticality: 'moderate',
        transportation_mode: 'self-carry'
      });
      
      if (result.success && result.data.length > 0) {
        const closest = result.data[0];
        console.log(`   🏥 Closest: ${closest.name} (${closest.distance_km}km, ${closest.travel_time_minutes}min)`);
      }
    }
    
    console.log('\n=== LOCATION ACCURACY TESTS COMPLETED ===');
    
    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS FOR ACCURATE LOCATION:');
    console.log('✅ Enable location services in your browser');
    console.log('✅ Allow location access when prompted');
    console.log('✅ Use HTTPS (required for high-accuracy GPS)');
    console.log('✅ Be outdoors or near windows for better GPS signal');
    console.log('✅ Wait a few seconds for high-accuracy positioning');
    console.log('✅ Check that you\'re physically in Jamaica for best results');

  } catch (error) {
    console.error('❌ Location accuracy test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testLocationAccuracy()
  .then(() => {
    console.log('\n🎉 Location accuracy testing completed!');
    console.log('\nThe system will use your actual GPS coordinates when:');
    console.log('• You grant location permission in your browser');
    console.log('• Your device has GPS/location services enabled');
    console.log('• You\'re using HTTPS (required for high accuracy)');
    console.log('• Your browser supports geolocation API');
    console.log('\nIf location detection fails, hospitals will be shown in alphabetical order.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });