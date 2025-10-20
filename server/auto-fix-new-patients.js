import { 
  initializeEnhancedDatabase, 
  getPatientReports, 
  saveTravelEstimate,
  getHospitals
} from './database-enhanced.js';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

/**
 * Auto-fix any new patients that don't have proper location and travel time data
 */

async function autoFixNewPatients() {
  console.log('🔍 Checking for new patients that need fixing...\n');
  
  try {
    await initializeEnhancedDatabase();
    
    // Get all patients
    const reports = await getPatientReports();
    const hospitals = await getHospitals();
    
    // Find patients missing location or travel time data
    const patientsToFix = reports.filter(report => 
      !report.location_address || 
      !report.latitude || 
      !report.longitude || 
      !report.travel_time_minutes ||
      report.travel_time_minutes > 120
    );
    
    if (patientsToFix.length === 0) {
      console.log('✅ All patients have proper travel time data!');
      return;
    }
    
    console.log(`📋 Found ${patientsToFix.length} patients that need fixing:`);
    patientsToFix.forEach(p => console.log(`  - ${p.name}: Missing ${!p.location_address ? 'address' : ''} ${!p.travel_time_minutes ? 'travel_time' : ''}`));
    
    // Fix each patient
    for (const patient of patientsToFix) {
      console.log(`\n🔧 Fixing ${patient.name}...`);
      
      // Add location if missing
      if (!patient.location_address || !patient.latitude || !patient.longitude) {
        await addLocationToPatient(patient);
      }
      
      // Add travel time data if missing or unrealistic
      if (!patient.travel_time_minutes || patient.travel_time_minutes > 120) {
        await addTravelTimeToPatient(patient, hospitals);
      }
    }
    
    // Verify fixes
    const updatedReports = await getPatientReports();
    const fixedCount = updatedReports.filter(r => 
      r.location_address && r.travel_time_minutes && r.travel_time_minutes <= 120
    ).length;
    
    console.log(`\n✅ Fix complete: ${fixedCount}/${updatedReports.length} patients now have proper data`);
    
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
  } finally {
    db.close();
  }
}

/**
 * Add realistic Jamaica location to a patient
 */
async function addLocationToPatient(patient) {
  const jamaicaLocations = [
    { lat: 18.0179, lng: -76.8099, address: 'Downtown Kingston' },
    { lat: 17.9692, lng: -76.8774, address: 'Spanish Town' },
    { lat: 18.0748, lng: -76.7516, address: 'Mona, St. Andrew' },
    { lat: 18.0070, lng: -76.7935, address: 'New Kingston' },
    { lat: 17.9970, lng: -76.7940, address: 'Half Way Tree' },
    { lat: 18.0463, lng: -76.8103, address: 'Constant Spring' },
    { lat: 18.0400, lng: -76.8200, address: 'Hope Pastures' },
    { lat: 18.0100, lng: -76.8000, address: 'Cross Roads' }
  ];
  
  // Assign location based on patient name hash for consistency
  const locationIndex = Math.abs(hashCode(patient.name)) % jamaicaLocations.length;
  const location = jamaicaLocations[locationIndex];
  
  // Add small random variation
  const lat = location.lat + (Math.random() - 0.5) * 0.003;
  const lng = location.lng + (Math.random() - 0.5) * 0.003;
  
  return new Promise((resolve) => {
    db.run(`
      UPDATE patient_reports 
      SET latitude = ?, longitude = ?, location_address = ?
      WHERE report_id = ?
    `, [lat, lng, location.address, patient.report_id], function(err) {
      if (err) {
        console.error(`❌ Error adding location to ${patient.name}:`, err);
      } else {
        console.log(`  📍 Added location: ${location.address} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
      resolve();
    });
  });
}

/**
 * Add travel time estimates to a patient
 */
async function addTravelTimeToPatient(patient, hospitals) {
  // Get fresh patient data with updated coordinates
  const updatedReports = await getPatientReports({ report_id: patient.report_id });
  const updatedPatient = updatedReports[0];
  
  if (!updatedPatient.latitude || !updatedPatient.longitude) {
    console.log(`  ⚠️  ${patient.name} still missing coordinates, skipping travel time`);
    return;
  }
  
  console.log(`  ⏱️  Generating travel estimates...`);
  
  for (const hospital of hospitals) {
    const distance = calculateDistance(
      { lat: updatedPatient.latitude, lng: updatedPatient.longitude },
      { lat: hospital.latitude, lng: hospital.longitude }
    );
    
    const travelTime = generateRealisticTravelTime(distance, hospital);
    const trafficFactor = getCurrentTrafficFactor();
    
    await saveTravelEstimate(
      updatedPatient.report_id,
      hospital.hospital_id,
      travelTime,
      Math.round(distance),
      trafficFactor,
      'auto_fixed'
    );
    
    console.log(`    🏥 ${hospital.name}: ${Math.round(travelTime/60)} min`);
  }
}

/**
 * Generate realistic travel time for Jamaica
 */
function generateRealisticTravelTime(distanceMeters, hospital) {
  const distanceKm = distanceMeters / 1000;
  
  let speed = 25; // Default speed km/h
  
  if (hospital.name.includes('Kingston Public')) {
    speed = 18;
  } else if (hospital.name.includes('University Hospital')) {
    speed = 25;
  } else if (hospital.name.includes('Spanish Town')) {
    speed = 22;
  }
  
  let timeMinutes = (distanceKm / speed) * 60;
  
  // Apply constraints
  const minTime = Math.max(4, distanceKm * 0.8);
  const maxTime = Math.min(70, distanceKm * 2.5);
  
  timeMinutes = Math.max(minTime, Math.min(maxTime, timeMinutes));
  
  // Add variation
  timeMinutes *= (0.9 + Math.random() * 0.2);
  
  return Math.round(timeMinutes * 60);
}

/**
 * Get current traffic factor
 */
function getCurrentTrafficFactor() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  if (day === 0 || day === 6) return 0.85;
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) return 1.15;
  if (hour >= 22 || hour <= 6) return 0.8;
  return 1.0;
}

/**
 * Calculate distance using Haversine formula
 */
function calculateDistance(point1, point2) {
  const R = 6371000;
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Simple hash function for consistent location assignment
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Run the auto-fix
autoFixNewPatients();