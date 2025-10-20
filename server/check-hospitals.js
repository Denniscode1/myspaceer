import sqlite3 from 'sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dbPath = join(__dirname, 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CURRENT HOSPITAL DATA ===');

db.all('SELECT hospital_id, name, latitude, longitude, specialties, is_active FROM hospitals ORDER BY name', (err, rows) => {
  if (err) {
    console.error('Error fetching hospitals:', err);
    process.exit(1);
  }
  
  console.log(`Found ${rows.length} hospitals in database:`);
  console.log('-----------------------------------');
  
  rows.forEach((hospital, index) => {
    console.log(`${index + 1}. ${hospital.name} (${hospital.hospital_id})`);
    console.log(`   Location: ${hospital.latitude}, ${hospital.longitude}`);
    console.log(`   Active: ${hospital.is_active ? 'Yes' : 'No'}`);
    console.log(`   Specialties: ${hospital.specialties || 'None'}`);
    console.log('-----------------------------------');
  });

  // Check queue data as well
  db.all(`
    SELECT h.name, h.hospital_id, COUNT(qm.report_id) as queue_count
    FROM hospitals h 
    LEFT JOIN queue_management qm ON h.hospital_id = qm.hospital_id AND qm.status = 'waiting'
    GROUP BY h.hospital_id, h.name
    ORDER BY queue_count DESC
  `, (err, queueData) => {
    if (err) {
      console.error('Error fetching queue data:', err);
    } else {
      console.log('\n=== QUEUE DATA BY HOSPITAL ===');
      queueData.forEach(item => {
        console.log(`${item.name}: ${item.queue_count} patients in queue`);
      });
    }
    
    db.close();
    process.exit(0);
  });
});