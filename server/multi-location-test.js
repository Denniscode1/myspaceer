import { hospitalSelector } from './services/hospitalSelector.js';

console.log('🏥 Testing Hospital Selection Across Jamaica...\n');

const testLocations = [
  {
    name: 'Kingston (New Kingston)',
    latitude: 18.0179,
    longitude: -76.8099
  },
  {
    name: 'Montego Bay',
    latitude: 18.4762,
    longitude: -77.8934
  },
  {
    name: 'Mandeville',
    latitude: 18.0425,
    longitude: -77.5044
  },
  {
    name: 'Spanish Town',
    latitude: 17.9909,
    longitude: -76.9573
  },
  {
    name: 'Ocho Rios (St. Ann)',
    latitude: 18.4078,
    longitude: -77.1038
  }
];

setTimeout(async () => {
  console.log('Hospital database loaded with 26 hospitals\n');
  
  for (const location of testLocations) {
    try {
      console.log(`📍 Testing: ${location.name}`);
      console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
      
      const testData = {
        report_id: `test_${location.name.replace(/\s+/g, '_')}_001`,
        latitude: location.latitude,
        longitude: location.longitude,
        transportation_mode: 'self-carry'
      };

      const result = await hospitalSelector.selectNearestHospital(testData);
      
      if (result && result.selected_hospital) {
        console.log(`✅ Closest Hospital: ${result.selected_hospital.name}`);
        console.log(`   Distance: ${result.selected_hospital.distance.toFixed(2)} km`);
        console.log(`   ETA: ${result.selected_hospital.travelTime} minutes`);
        console.log(`   ${result.selection_reason}`);
      } else {
        console.log('❌ No hospital found');
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${location.name}: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }
  
  console.log('🏁 All location tests completed!');
}, 3000);