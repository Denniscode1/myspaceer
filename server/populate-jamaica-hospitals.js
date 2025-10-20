import sqlite3 from 'sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dbPath = join(__dirname, 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

// Comprehensive list of Jamaica hospitals with accurate coordinates and specialties
const jamaicaHospitals = [
  // Kingston Metropolitan Area
  {
    hospital_id: 'HOSP001',
    name: 'Kingston Public Hospital',
    address: 'North Street, Kingston',
    latitude: 17.9714,
    longitude: -76.7931,
    specialties: ['Emergency', 'Trauma', 'Surgery', 'ICU', 'Orthopedics'],
    capacity: 500,
    average_treatment_time: 35
  },
  {
    hospital_id: 'HOSP003',
    name: 'University Hospital of the West Indies',
    address: 'Mona, Kingston 7',
    latitude: 18.0061,
    longitude: -76.7466,
    specialties: ['Emergency', 'Trauma', 'Surgery', 'ICU', 'Cardiology', 'Neurology', 'Pediatrics'],
    capacity: 600,
    average_treatment_time: 40
  },
  {
    hospital_id: 'HOSP004',
    name: 'Bustamante Hospital for Children',
    address: 'Arthur Wint Drive, Kingston 5',
    latitude: 18.0009,
    longitude: -76.7794,
    specialties: ['Emergency', 'Pediatrics', 'ICU', 'Surgery', 'Neonatology'],
    capacity: 250,
    average_treatment_time: 30
  },
  {
    hospital_id: 'HOSP005',
    name: 'National Chest Hospital',
    address: '1 Pawsey Road, Kingston 5',
    latitude: 17.9894,
    longitude: -76.7894,
    specialties: ['Emergency', 'Respiratory', 'Pulmonology', 'ICU'],
    capacity: 150,
    average_treatment_time: 25
  },
  {
    hospital_id: 'HOSP006',
    name: 'Sir John Golding Rehabilitation Centre',
    address: 'Papine, Kingston 7',
    latitude: 18.0156,
    longitude: -76.7419,
    specialties: ['Emergency', 'Rehabilitation', 'Neurology', 'Orthopedics'],
    capacity: 120,
    average_treatment_time: 45
  },

  // Spanish Town & St. Catherine
  {
    hospital_id: 'HOSP002',
    name: 'Spanish Town Hospital',
    address: '1 Burke Road, Spanish Town',
    latitude: 17.9909,
    longitude: -76.9574,
    specialties: ['Emergency', 'General Medicine', 'Pediatrics', 'Surgery'],
    capacity: 300,
    average_treatment_time: 30
  },
  {
    hospital_id: 'HOSP007',
    name: 'Linstead Hospital',
    address: 'Bog Walk Road, Linstead',
    latitude: 18.1356,
    longitude: -77.0317,
    specialties: ['Emergency', 'General Medicine', 'Maternity'],
    capacity: 100,
    average_treatment_time: 25
  },

  // Portmore
  {
    hospital_id: 'HOSP008',
    name: 'Portmore Heart Academy & Hospital',
    address: 'Portmore Pines Plaza, Portmore',
    latitude: 17.9527,
    longitude: -76.8847,
    specialties: ['Emergency', 'Cardiology', 'Surgery', 'ICU'],
    capacity: 200,
    average_treatment_time: 30
  },

  // St. Andrew
  {
    hospital_id: 'HOSP009',
    name: 'Andrews Memorial Hospital',
    address: '27 Hope Road, Kingston 10',
    latitude: 18.0171,
    longitude: -76.7831,
    specialties: ['Emergency', 'General Medicine', 'Surgery', 'Maternity'],
    capacity: 180,
    average_treatment_time: 28
  },
  {
    hospital_id: 'HOSP010',
    name: 'Hope Institute Hospital',
    address: '4 Hope Boulevard, Kingston 6',
    latitude: 18.0111,
    longitude: -76.7694,
    specialties: ['Emergency', 'Mental Health', 'Psychiatry'],
    capacity: 150,
    average_treatment_time: 35
  },

  // Spanish Town & Surrounding Areas
  {
    hospital_id: 'HOSP011',
    name: 'St. Jago Park Hospital',
    address: 'Spanish Town, St. Catherine',
    latitude: 17.9828,
    longitude: -76.9428,
    specialties: ['Emergency', 'General Medicine', 'Surgery'],
    capacity: 140,
    average_treatment_time: 25
  },

  // St. Thomas
  {
    hospital_id: 'HOSP012',
    name: 'Princess Margaret Hospital',
    address: 'Morant Bay, St. Thomas',
    latitude: 17.8819,
    longitude: -76.4092,
    specialties: ['Emergency', 'General Medicine', 'Maternity', 'Surgery'],
    capacity: 120,
    average_treatment_time: 25
  },

  // Portland
  {
    hospital_id: 'HOSP013',
    name: 'Port Antonio Hospital',
    address: 'Naylor Hill, Port Antonio',
    latitude: 18.1708,
    longitude: -76.4481,
    specialties: ['Emergency', 'General Medicine', 'Surgery'],
    capacity: 100,
    average_treatment_time: 20
  },

  // St. Mary
  {
    hospital_id: 'HOSP014',
    name: 'Annotto Bay Hospital',
    address: 'Annotto Bay, St. Mary',
    latitude: 18.2747,
    longitude: -76.7806,
    specialties: ['Emergency', 'General Medicine', 'Maternity'],
    capacity: 80,
    average_treatment_time: 20
  },

  // St. Ann
  {
    hospital_id: 'HOSP015',
    name: 'St. Ann\'s Bay Hospital',
    address: 'St. Ann\'s Bay, St. Ann',
    latitude: 18.4372,
    longitude: -77.2022,
    specialties: ['Emergency', 'General Medicine', 'Surgery', 'Maternity'],
    capacity: 150,
    average_treatment_time: 25
  },

  // Clarendon
  {
    hospital_id: 'HOSP016',
    name: 'May Pen Hospital',
    address: 'Hospital Street, May Pen',
    latitude: 17.9644,
    longitude: -77.2417,
    specialties: ['Emergency', 'General Medicine', 'Surgery', 'Maternity'],
    capacity: 200,
    average_treatment_time: 30
  },
  {
    hospital_id: 'HOSP017',
    name: 'Lionel Town Hospital',
    address: 'Lionel Town, Clarendon',
    latitude: 17.8042,
    longitude: -77.2339,
    specialties: ['Emergency', 'General Medicine'],
    capacity: 60,
    average_treatment_time: 20
  },

  // Manchester
  {
    hospital_id: 'HOSP018',
    name: 'Mandeville Regional Hospital',
    address: 'Hargreaves Avenue, Mandeville',
    latitude: 18.0420,
    longitude: -77.5028,
    specialties: ['Emergency', 'General Medicine', 'Surgery', 'ICU', 'Cardiology'],
    capacity: 300,
    average_treatment_time: 35
  },
  {
    hospital_id: 'HOSP019',
    name: 'Hargreaves Memorial Hospital',
    address: 'Mandeville, Manchester',
    latitude: 18.0356,
    longitude: -77.5072,
    specialties: ['Emergency', 'General Medicine', 'Surgery', 'Maternity'],
    capacity: 120,
    average_treatment_time: 25
  },

  // St. Elizabeth
  {
    hospital_id: 'HOSP020',
    name: 'Black River Hospital',
    address: 'Black River, St. Elizabeth',
    latitude: 18.0258,
    longitude: -77.8544,
    specialties: ['Emergency', 'General Medicine', 'Maternity'],
    capacity: 100,
    average_treatment_time: 25
  },
  {
    hospital_id: 'HOSP021',
    name: 'Noel Holmes Hospital',
    address: 'Santa Cruz, St. Elizabeth',
    latitude: 18.0847,
    longitude: -77.7508,
    specialties: ['Emergency', 'General Medicine', 'Surgery'],
    capacity: 80,
    average_treatment_time: 20
  },

  // Westmoreland
  {
    hospital_id: 'HOSP022',
    name: 'Savanna-la-Mar Hospital',
    address: 'Rose Street, Savanna-la-Mar',
    latitude: 18.2183,
    longitude: -78.1331,
    specialties: ['Emergency', 'General Medicine', 'Surgery', 'Maternity'],
    capacity: 150,
    average_treatment_time: 25
  },

  // Hanover
  {
    hospital_id: 'HOSP023',
    name: 'Noel Holmes Hospital (Hanover)',
    address: 'Lucea, Hanover',
    latitude: 18.4511,
    longitude: -78.1719,
    specialties: ['Emergency', 'General Medicine'],
    capacity: 60,
    average_treatment_time: 20
  },

  // St. James
  {
    hospital_id: 'HOSP024',
    name: 'Cornwall Regional Hospital',
    address: 'Mount Salem, Montego Bay',
    latitude: 18.4750,
    longitude: -77.9264,
    specialties: ['Emergency', 'Trauma', 'Surgery', 'ICU', 'Cardiology', 'Neurology'],
    capacity: 400,
    average_treatment_time: 40
  },
  {
    hospital_id: 'HOSP025',
    name: 'Montego Bay Community Hospital',
    address: 'Montego Bay, St. James',
    latitude: 18.4706,
    longitude: -77.9197,
    specialties: ['Emergency', 'General Medicine', 'Surgery'],
    capacity: 120,
    average_treatment_time: 25
  },

  // Trelawny
  {
    hospital_id: 'HOSP026',
    name: 'Falmouth Hospital',
    address: 'Falmouth, Trelawny',
    latitude: 18.4919,
    longitude: -77.6511,
    specialties: ['Emergency', 'General Medicine', 'Maternity'],
    capacity: 100,
    average_treatment_time: 25
  }
];

function insertHospitals() {
  return new Promise((resolve, reject) => {
    console.log('Populating Jamaica hospitals database...');
    
    // First, backup existing hospitals (just in case)
    db.run('CREATE TABLE IF NOT EXISTS hospitals_backup AS SELECT * FROM hospitals WHERE 1=0', (err) => {
      if (err) console.warn('Warning: Could not create backup table:', err.message);
    });
    
    // Clear existing hospitals except the ones we want to keep/update
    db.run('DELETE FROM hospitals', (err) => {
      if (err) {
        console.error('Error clearing hospitals:', err);
        reject(err);
        return;
      }
      
      let completed = 0;
      const total = jamaicaHospitals.length;
      
      // Insert each hospital
      jamaicaHospitals.forEach((hospital) => {
        const sql = `
          INSERT OR REPLACE INTO hospitals (
            hospital_id, name, address, latitude, longitude, specialties, 
            capacity, current_load, average_treatment_time, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `;
        
        const specialtiesJson = JSON.stringify(hospital.specialties);
        const currentLoad = Math.floor(Math.random() * (hospital.capacity * 0.3)); // Random current load up to 30%
        
        db.run(sql, [
          hospital.hospital_id,
          hospital.name,
          hospital.address,
          hospital.latitude,
          hospital.longitude,
          specialtiesJson,
          hospital.capacity,
          currentLoad,
          hospital.average_treatment_time
        ], function(err) {
          if (err) {
            console.error(`Error inserting hospital ${hospital.name}:`, err);
            reject(err);
            return;
          }
          
          completed++;
          console.log(`✓ Inserted ${hospital.name} (${hospital.hospital_id})`);
          
          if (completed === total) {
            console.log(`\n✅ Successfully populated ${total} Jamaica hospitals!`);
            resolve();
          }
        });
      });
    });
  });
}

// Run the population
insertHospitals()
  .then(() => {
    console.log('\n=== VERIFYING HOSPITAL DATA ===');
    
    db.all(`
      SELECT hospital_id, name, latitude, longitude, capacity, 
             JSON_EXTRACT(specialties, '$') as spec_count, is_active
      FROM hospitals 
      ORDER BY name
    `, (err, rows) => {
      if (err) {
        console.error('Error verifying data:', err);
        process.exit(1);
      }
      
      console.log(`Total hospitals: ${rows.length}`);
      console.log('\nHospitals by parish:');
      
      const byParish = {
        'Kingston/St. Andrew': rows.filter(h => h.name.includes('Kingston') || h.name.includes('Andrews') || h.name.includes('University') || h.name.includes('Bustamante') || h.name.includes('Chest') || h.name.includes('Golding') || h.name.includes('Hope')).length,
        'St. Catherine': rows.filter(h => h.name.includes('Spanish Town') || h.name.includes('Linstead') || h.name.includes('Jago')).length,
        'Portmore': rows.filter(h => h.name.includes('Portmore')).length,
        'St. James': rows.filter(h => h.name.includes('Cornwall') || h.name.includes('Montego')).length,
        'Manchester': rows.filter(h => h.name.includes('Mandeville') || h.name.includes('Hargreaves')).length,
        'Other Parishes': rows.length - rows.filter(h => 
          h.name.includes('Kingston') || h.name.includes('Andrews') || h.name.includes('University') || 
          h.name.includes('Bustamante') || h.name.includes('Chest') || h.name.includes('Golding') || 
          h.name.includes('Hope') || h.name.includes('Spanish Town') || h.name.includes('Linstead') || 
          h.name.includes('Jago') || h.name.includes('Portmore') || h.name.includes('Cornwall') || 
          h.name.includes('Montego') || h.name.includes('Mandeville') || h.name.includes('Hargreaves')
        ).length
      };
      
      Object.entries(byParish).forEach(([parish, count]) => {
        console.log(`  ${parish}: ${count} hospitals`);
      });
      
      db.close();
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('Failed to populate hospitals:', err);
    db.close();
    process.exit(1);
  });