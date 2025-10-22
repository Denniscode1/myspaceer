import { selectNearestHospital } from './server/services/hospitalSelector.js';
import { getHospitals } from './server/database-enhanced.js';

// Knockpatrick, Mandeville, Manchester coordinates (approximate)
const knockpatrickLocation = {
  report_id: 'TEST_KNOCKPATRICK',
  latitude: 18.0400,  // Knockpatrick area
  longitude: -77.4950,
  criticality: 'moderate',
  incident_type: 'motor-vehicle-accident',
  age_range: '26-35',
  transportation_mode: 'ambulance'
};

console.log('🔍 Testing Hospital Selection from Knockpatrick, Mandeville');
console.log('Test Location:', knockpatrickLocation);
console.log('='.repeat(60));

// Get all hospitals first
getHospitals().then(hospitals => {
  console.log(`\n📊 Total hospitals in database: ${hospitals.length}`);
  
  // Calculate distances to nearby hospitals
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const toRadians = (deg) => deg * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  // Find closest hospitals manually
  const hospitalDistances = hospitals.map(hospital => ({
    name: hospital.name,
    hospital_id: hospital.hospital_id,
    distance_km: calculateDistance(
      knockpatrickLocation.latitude,
      knockpatrickLocation.longitude,
      hospital.latitude,
      hospital.longitude
    ),
    capacity: hospital.capacity,
    specialties: hospital.specialties
  }))
  .sort((a, b) => a.distance_km - b.distance_km)
  .slice(0, 10); // Top 10 closest
  
  console.log('\n📍 10 Closest Hospitals from Knockpatrick:\n');
  hospitalDistances.forEach((h, idx) => {
    console.log(`${idx + 1}. ${h.name}`);
    console.log(`   Distance: ${h.distance_km.toFixed(2)} km`);
    console.log(`   Capacity: ${h.capacity} beds`);
    console.log(`   Specialties: ${JSON.stringify(h.specialties)}`);
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('\n🏥 Testing Hospital Selection Algorithm...\n');
  
  // Now test the actual selection algorithm
  return selectNearestHospital(knockpatrickLocation);
})
.then(result => {
  const selected = result.selected_hospital;
  console.log('✅ SELECTED HOSPITAL:');
  console.log(`   Name: ${selected.name || selected.hospital_name}`);
  console.log(`   Hospital ID: ${selected.hospital_id}`);
  console.log(`   Distance: ${selected.distance?.toFixed(2) || 'N/A'} km`);
  console.log(`   Travel Time: ${selected.travelTime || 'N/A'} minutes`);
  console.log(`   Reason: ${result.selection_reason}`);
  console.log('\n' + '='.repeat(60));
  
  // Check if it's the right hospital
  if (selected.name?.includes('Mandeville')) {
    console.log('\n✅ CORRECT: Patient routed to Mandeville hospital');
  } else {
    console.log('\n❌ ISSUE: Patient NOT routed to nearest Mandeville hospital');
    console.log('   This could be a problem with the selection algorithm.');
  }
  
  process.exit(0);
})
.catch(error => {
  console.error('\n❌ Error during testing:', error);
  process.exit(1);
});
