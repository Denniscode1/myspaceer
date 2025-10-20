import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection
const dbPath = join(__dirname, 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

// Initialize enhanced database schema for emergency triage system
export const initializeEnhancedDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Patient Reports table - main entity for emergency submissions
      db.run(`
        CREATE TABLE IF NOT EXISTS patient_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          gender TEXT NOT NULL,
          age_range TEXT NOT NULL,
          trn TEXT,
          incident_type TEXT NOT NULL,
          incident_description TEXT,
          patient_status TEXT NOT NULL,
          transportation_mode TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          location_address TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          emergency_contact_name TEXT,
          emergency_contact_phone TEXT,
          assigned_doctor_id TEXT,
          assigned_doctor_name TEXT,
          doctor_assigned_at DATETIME,
          doctor_released_at DATETIME,
          status TEXT DEFAULT 'Created',
          submitted_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Triage Results table - stores triage decisions and reasoning
      db.run(`
        CREATE TABLE IF NOT EXISTS triage_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          criticality TEXT NOT NULL,
          criticality_reason TEXT,
          confidence_score REAL,
          triage_method TEXT DEFAULT 'deterministic',
          ml_features TEXT,
          processing_time_ms INTEGER,
          triaged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          overridden_by TEXT,
          override_reason TEXT,
          override_at DATETIME,
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id)
        )
      `);

      // Hospitals table - available hospitals and their capabilities
      db.run(`
        CREATE TABLE IF NOT EXISTS hospitals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hospital_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          specialties TEXT,
          capacity INTEGER DEFAULT 100,
          current_load INTEGER DEFAULT 0,
          average_treatment_time INTEGER DEFAULT 30,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Travel Time Estimates table - ETA calculations for different routes
      db.run(`
        CREATE TABLE IF NOT EXISTS travel_estimates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          hospital_id TEXT NOT NULL,
          estimated_time_seconds INTEGER NOT NULL,
          distance_meters INTEGER,
          traffic_factor REAL DEFAULT 1.0,
          calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          routing_provider TEXT DEFAULT 'osrm',
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id),
          FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
      `);

      // Hospital Assignments table - final hospital selection for each patient
      db.run(`
        CREATE TABLE IF NOT EXISTS hospital_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          hospital_id TEXT NOT NULL,
          assignment_score REAL,
          assignment_reason TEXT,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          hms_case_id TEXT,
          hms_encounter_id TEXT,
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id),
          FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
      `);

      // Patient Queue table - priority queue management
      db.run(`
        CREATE TABLE IF NOT EXISTS patient_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          hospital_id TEXT NOT NULL,
          queue_position INTEGER NOT NULL,
          priority_score REAL NOT NULL,
          estimated_wait_time INTEGER,
          queue_status TEXT DEFAULT 'waiting',
          assigned_doctor_id TEXT,
          entered_queue_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id),
          FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
      `);

      // Queue Management table - AI-powered queue management
      db.run(`
        CREATE TABLE IF NOT EXISTS queue_management (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          hospital_id TEXT NOT NULL,
          queue_position INTEGER NOT NULL,
          criticality TEXT,
          estimated_wait_time INTEGER,
          ai_confidence REAL,
          ai_reasoning TEXT,
          status TEXT DEFAULT 'waiting',
          assigned_doctor_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id),
          FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
      `);

      // Doctor Shifts table - doctor availability and specialties
      db.run(`
        CREATE TABLE IF NOT EXISTS doctor_shifts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id TEXT NOT NULL,
          hospital_id TEXT NOT NULL,
          doctor_name TEXT NOT NULL,
          specialties TEXT,
          shift_start DATETIME NOT NULL,
          shift_end DATETIME NOT NULL,
          max_concurrent_patients INTEGER DEFAULT 3,
          current_patient_count INTEGER DEFAULT 0,
          is_available BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
      `);

      // Event Log table - audit trail for all system events
      db.run(`
        CREATE TABLE IF NOT EXISTS event_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          user_id TEXT,
          user_role TEXT,
          event_data TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          correlation_id TEXT
        )
      `);

      // Notification Queue table - pending notifications
      db.run(`
        CREATE TABLE IF NOT EXISTS notification_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          recipient TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sent_at DATETIME,
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id)
        )
      `);

      // Add missing columns used by notification service (idempotent)
      db.run(`ALTER TABLE notification_queue ADD COLUMN updated_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding updated_at to notification_queue:', err.message);
        }
      });
      db.run(`ALTER TABLE notification_queue ADD COLUMN error_message TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding error_message to notification_queue:', err.message);
        }
      });

      // Treated Patients table - completed treatments tracking
      db.run(`
        CREATE TABLE IF NOT EXISTS treated_patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          patient_name TEXT NOT NULL,
          trn TEXT,
          age_range TEXT NOT NULL,
          gender TEXT NOT NULL,
          incident_type TEXT NOT NULL,
          incident_description TEXT,
          original_criticality TEXT,
          hospital_id TEXT NOT NULL,
          hospital_name TEXT NOT NULL,
          treating_doctor_id TEXT,
          treating_doctor_name TEXT,
          treatment_started_at DATETIME,
          treatment_completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          treatment_duration_minutes INTEGER,
          treatment_notes TEXT,
          treatment_outcome TEXT,
          discharge_status TEXT DEFAULT 'discharged',
          follow_up_required BOOLEAN DEFAULT 0,
          follow_up_notes TEXT,
          patient_satisfaction_rating INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (report_id) REFERENCES patient_reports (report_id),
          FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id)
        )
      `);

      // Triage Rules Configuration table - configurable business rules
      db.run(`
        CREATE TABLE IF NOT EXISTS triage_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_name TEXT NOT NULL,
          rule_conditions TEXT NOT NULL,
          criticality_result TEXT NOT NULL,
          priority INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add new columns to existing tables if they don't exist
      db.run(`ALTER TABLE patient_reports ADD COLUMN assigned_doctor_id TEXT`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding assigned_doctor_id column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE patient_reports ADD COLUMN assigned_doctor_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding assigned_doctor_name column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE patient_reports ADD COLUMN doctor_assigned_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding doctor_assigned_at column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE patient_reports ADD COLUMN doctor_released_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding doctor_released_at column:', err.message);
        }
      });
      
      // Add AI processing columns
      db.run(`ALTER TABLE patient_reports ADD COLUMN ai_processed INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding ai_processed column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE patient_reports ADD COLUMN ai_criticality TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding ai_criticality column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE patient_reports ADD COLUMN ai_confidence REAL`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding ai_confidence column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE patient_reports ADD COLUMN assigned_hospital_id TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Error adding assigned_hospital_id column:', err.message);
        }
      });

      console.log('Enhanced emergency triage database schema created successfully');
      resolve();
    });
  });
};

// Insert default hospitals and triage rules
export const seedDefaultData = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Insert default hospitals
      const hospitals = [
        {
          hospital_id: 'HOSP001',
          name: 'Kingston Public Hospital',
          address: '76 North St, Kingston, Jamaica',
          latitude: 17.9714,
          longitude: -76.7931,
          specialties: JSON.stringify(['Emergency', 'Trauma', 'Surgery', 'ICU']),
          capacity: 150
        },
        {
          hospital_id: 'HOSP002', 
          name: 'Spanish Town Hospital',
          address: 'Burke Rd, Spanish Town, Jamaica',
          latitude: 17.9909,
          longitude: -76.9574,
          specialties: JSON.stringify(['Emergency', 'General Medicine', 'Pediatrics']),
          capacity: 100
        },
        {
          hospital_id: 'HOSP003',
          name: 'University Hospital of the West Indies',
          address: 'Mona Campus, Kingston 7, Jamaica',
          latitude: 18.0061,
          longitude: -76.7466,
          specialties: JSON.stringify(['Emergency', 'Trauma', 'Surgery', 'ICU', 'Cardiology', 'Neurology']),
          capacity: 200
        }
      ];

      hospitals.forEach(hospital => {
        db.run(`
          INSERT OR IGNORE INTO hospitals (hospital_id, name, address, latitude, longitude, specialties, capacity)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [hospital.hospital_id, hospital.name, hospital.address, hospital.latitude, hospital.longitude, hospital.specialties, hospital.capacity]);
      });

      // Insert default triage rules
      const triageRules = [
        {
          rule_name: 'Shooting + Unconscious = Severe',
          rule_conditions: JSON.stringify({
            incident_type: 'shooting',
            patient_status: 'unconscious'
          }),
          criticality_result: 'severe',
          priority: 10
        },
        {
          rule_name: 'Motor Vehicle Accident + Age 51+ + Ambulance = High',
          rule_conditions: JSON.stringify({
            incident_type: 'motor-vehicle-accident',
            age_range: '51+',
            transportation_mode: 'ambulance'
          }),
          criticality_result: 'high',
          priority: 8
        },
        {
          rule_name: 'Stabbing + Unconscious = Severe',
          rule_conditions: JSON.stringify({
            incident_type: 'stabbing',
            patient_status: 'unconscious'
          }),
          criticality_result: 'severe',
          priority: 9
        },
        {
          rule_name: 'Any Shooting = High',
          rule_conditions: JSON.stringify({
            incident_type: 'shooting'
          }),
          criticality_result: 'high',
          priority: 7
        }
      ];

      triageRules.forEach(rule => {
        db.run(`
          INSERT OR IGNORE INTO triage_rules (rule_name, rule_conditions, criticality_result, priority)
          VALUES (?, ?, ?, ?)
        `, [rule.rule_name, rule.rule_conditions, rule.criticality_result, rule.priority]);
      });

      // Insert sample doctor shifts
      const doctorShifts = [
        {
          doctor_id: 'DOC001',
          hospital_id: 'HOSP001',
          doctor_name: 'Dr. Sarah Williams',
          specialties: JSON.stringify(['emergency_medicine', 'trauma', 'surgery']),
          shift_start: '08:00:00',
          shift_end: '20:00:00',
          max_concurrent_patients: 4,
          current_patient_count: 1
        },
        {
          doctor_id: 'DOC002',
          hospital_id: 'HOSP001',
          doctor_name: 'Dr. Michael Brown',
          specialties: JSON.stringify(['emergency_medicine', 'critical_care', 'cardiology']),
          shift_start: '20:00:00',
          shift_end: '08:00:00',
          max_concurrent_patients: 3,
          current_patient_count: 0
        },
        {
          doctor_id: 'DOC003',
          hospital_id: 'HOSP002',
          doctor_name: 'Dr. Jennifer Davis',
          specialties: JSON.stringify(['emergency_medicine', 'pediatrics']),
          shift_start: '06:00:00',
          shift_end: '18:00:00',
          max_concurrent_patients: 3,
          current_patient_count: 2
        },
        {
          doctor_id: 'DOC004',
          hospital_id: 'HOSP003',
          doctor_name: 'Dr. Robert Thompson',
          specialties: JSON.stringify(['emergency_medicine', 'neurology', 'trauma']),
          shift_start: '09:00:00',
          shift_end: '21:00:00',
          max_concurrent_patients: 5,
          current_patient_count: 3
        },
        {
          doctor_id: 'DOC005',
          hospital_id: 'HOSP003',
          doctor_name: 'Dr. Lisa Garcia',
          specialties: JSON.stringify(['emergency_medicine', 'surgery', 'orthopedics']),
          shift_start: '12:00:00',
          shift_end: '00:00:00',
          max_concurrent_patients: 4,
          current_patient_count: 1
        }
      ];

      doctorShifts.forEach(doctor => {
        db.run(`
          INSERT OR IGNORE INTO doctor_shifts 
          (doctor_id, hospital_id, doctor_name, specialties, shift_start, shift_end, max_concurrent_patients, current_patient_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [doctor.doctor_id, doctor.hospital_id, doctor.doctor_name, doctor.specialties, doctor.shift_start, doctor.shift_end, doctor.max_concurrent_patients, doctor.current_patient_count]);
      });

      console.log('Default hospitals, triage rules, and doctor shifts seeded successfully');
      resolve();
    });
  });
};

// Database operations for patient reports
export const createPatientReport = (reportData) => {
  return new Promise((resolve, reject) => {
    const reportId = `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const sql = `
      INSERT INTO patient_reports (
        report_id, name, gender, age_range, trn, incident_type, incident_description,
        patient_status, transportation_mode, latitude, longitude, location_address,
        contact_email, contact_phone, emergency_contact_name, emergency_contact_phone, 
        assigned_doctor_id, assigned_doctor_name, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      reportId,
      reportData.name,
      reportData.gender,
      reportData.age_range || reportData.ageRange,
      reportData.trn,
      reportData.incident_type || reportData.incident,
      reportData.incident_description || reportData.customIncident,
      reportData.patient_status || reportData.patientStatus,
      reportData.transportation_mode || reportData.transportationMode,
      reportData.latitude,
      reportData.longitude,
      reportData.location_address,
      reportData.contact_email || reportData.contactEmail,
      reportData.contact_phone || reportData.contactPhone,
      reportData.emergency_contact_name || reportData.emergencyContact,
      reportData.emergency_contact_phone || reportData.emergencyPhone,
      reportData.assigned_doctor_id || null,
      reportData.assigned_doctor_name || null,
      reportData.submitted_at || new Date().toISOString()
    ];

    db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        // Log the event
        logEvent('report_created', 'patient_report', reportId, null, null, reportData);
        resolve({ id: this.lastID, report_id: reportId, ...reportData });
      }
    });
  });
};

export const getPatientReports = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT pr.*, tr.criticality, tr.criticality_reason, tr.confidence_score,
             ha.hospital_id, h.name as hospital_name,
             pq.queue_position, pq.estimated_wait_time,
             te.estimated_time_seconds as travel_time_seconds,
             te.distance_meters as travel_distance_meters,
             te.traffic_factor, te.routing_provider
      FROM patient_reports pr
      LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
      LEFT JOIN hospital_assignments ha ON pr.report_id = ha.report_id
      LEFT JOIN hospitals h ON ha.hospital_id = h.hospital_id
      LEFT JOIN patient_queue pq ON pr.report_id = pq.report_id AND pq.queue_status = 'waiting'
      LEFT JOIN travel_estimates te ON pr.report_id = te.report_id AND te.hospital_id = ha.hospital_id
    `;

    // Handle filters if provided
    const conditions = [];
    const params = [];
    
    if (filters.report_id) {
      conditions.push('pr.report_id = ?');
      params.push(filters.report_id);
    }
    
    if (filters.status) {
      conditions.push('pr.status = ?');
      params.push(filters.status);
    }
    
    if (filters.hospital_id) {
      conditions.push('ha.hospital_id = ?');
      params.push(filters.hospital_id);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY pr.created_at DESC';

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Process rows to add computed travel time fields
        const processedRows = rows.map(row => ({
          ...row,
          travel_time_minutes: row.travel_time_seconds ? Math.round(row.travel_time_seconds / 60) : null,
          travel_distance_km: row.travel_distance_meters ? Math.round((row.travel_distance_meters / 1000) * 10) / 10 : null,
          // Display readable location instead of coordinates
          location_display: row.location_address || 
            (row.latitude && row.longitude ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}` : 'Location not set'),
          // Format travel time for display
          travel_time_display: row.travel_time_seconds ? 
            (row.travel_time_seconds < 3600 ? `${Math.round(row.travel_time_seconds / 60)} min` : 
             `${Math.floor(row.travel_time_seconds / 3600)}h ${Math.round((row.travel_time_seconds % 3600) / 60)}min`) : null
        }));
        resolve(processedRows);
      }
    });
  });
};

export const updateReportStatus = (reportId, status, userId = null) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE patient_reports 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE report_id = ?
    `;

    db.run(sql, [status, reportId], function(err) {
      if (err) {
        reject(err);
      } else {
        logEvent('status_updated', 'patient_report', reportId, userId, null, { status });
        resolve({ report_id: reportId, status, changes: this.changes });
      }
    });
  });
};

// Triage operations
export const saveTriageResult = (triageData) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO triage_results (
        report_id, criticality, criticality_reason, confidence_score, triage_method, 
        ml_features, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      triageData.report_id,
      triageData.criticality,
      triageData.criticality_reason,
      triageData.confidence_score,
      triageData.triage_method,
      triageData.ml_features ? JSON.stringify(triageData.ml_features) : null,
      triageData.processing_time_ms
    ];

    db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        logEvent('triage_completed', 'triage_result', triageData.report_id, null, null, triageData);
        resolve({ id: this.lastID, ...triageData });
      }
    });
  });
};

// Hospital and queue operations
export const assignHospital = (reportId, hospitalId, assignmentScore, reason) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO hospital_assignments (report_id, hospital_id, assignment_score, assignment_reason)
      VALUES (?, ?, ?, ?)
    `;

    db.run(sql, [reportId, hospitalId, assignmentScore, reason], function(err) {
      if (err) {
        reject(err);
      } else {
        logEvent('hospital_assigned', 'hospital_assignment', reportId, null, null, { hospitalId, assignmentScore, reason });
        resolve({ id: this.lastID, report_id: reportId, hospital_id: hospitalId });
      }
    });
  });
};

export const addToQueue = (reportId, hospitalId, priorityScore) => {
  return new Promise((resolve, reject) => {
    // Get current max position for this hospital
    db.get('SELECT COALESCE(MAX(queue_position), 0) as max_position FROM patient_queue WHERE hospital_id = ? AND queue_status = "waiting"', 
      [hospitalId], 
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        const newPosition = row.max_position + 1;
        const sql = `
          INSERT INTO patient_queue (report_id, hospital_id, queue_position, priority_score)
          VALUES (?, ?, ?, ?)
        `;

        db.run(sql, [reportId, hospitalId, newPosition, priorityScore], function(insertErr) {
          if (insertErr) {
            reject(insertErr);
          } else {
            logEvent('queue_added', 'patient_queue', reportId, null, null, { hospitalId, position: newPosition, priorityScore });
            resolve({ id: this.lastID, position: newPosition, priority_score: priorityScore });
          }
        });
      }
    );
  });
};

// Event logging
export const logEvent = (eventType, entityType, entityId, userId, userRole, eventData) => {
  const correlationId = `CORR_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const sql = `
    INSERT INTO event_log (event_type, entity_type, entity_id, user_id, user_role, event_data, correlation_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    eventType, 
    entityType, 
    entityId, 
    userId, 
    userRole, 
    eventData ? JSON.stringify(eventData) : null, 
    correlationId
  ], (err) => {
    if (err) {
      console.error('Failed to log event:', err);
    }
  });
};

// Get triage rules
export const getTriageRules = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM triage_rules WHERE is_active = 1 ORDER BY priority DESC', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          rule_conditions: JSON.parse(row.rule_conditions)
        })));
      }
    });
  });
};

// Get hospitals
export const getHospitals = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM hospitals WHERE is_active = 1', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          specialties: JSON.parse(row.specialties || '[]')
        })));
      }
    });
  });
};

// Travel time operations
export const saveTravelEstimate = (reportId, hospitalId, estimatedTimeSeconds, distanceMeters, trafficFactor, routingProvider) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO travel_estimates (
        report_id, hospital_id, estimated_time_seconds, distance_meters, traffic_factor, routing_provider
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [reportId, hospitalId, estimatedTimeSeconds, distanceMeters, trafficFactor, routingProvider], function(err) {
      if (err) {
        reject(err);
      } else {
        logEvent('travel_estimate_saved', 'travel_estimate', reportId, null, null, {
          hospital_id: hospitalId,
          estimated_time_seconds: estimatedTimeSeconds,
          distance_meters: distanceMeters,
          traffic_factor: trafficFactor,
          routing_provider: routingProvider
        });
        resolve({ id: this.lastID, report_id: reportId, hospital_id: hospitalId });
      }
    });
  });
};

export const getTravelEstimate = (reportId, hospitalId = null) => {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM travel_estimates WHERE report_id = ?';
    let params = [reportId];
    
    if (hospitalId) {
      sql += ' AND hospital_id = ?';
      params.push(hospitalId);
    }
    
    sql += ' ORDER BY calculated_at DESC LIMIT 1';
    
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Treated patients operations
export const createTreatedPatient = (treatedData) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO treated_patients (
        report_id, patient_name, trn, age_range, gender, incident_type, incident_description,
        original_criticality, hospital_id, hospital_name, treating_doctor_id, treating_doctor_name,
        treatment_started_at, treatment_completed_at, treatment_duration_minutes, treatment_notes,
        treatment_outcome, discharge_status, follow_up_required, follow_up_notes, patient_satisfaction_rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      treatedData.report_id,
      treatedData.patient_name,
      treatedData.trn,
      treatedData.age_range,
      treatedData.gender,
      treatedData.incident_type,
      treatedData.incident_description,
      treatedData.original_criticality,
      treatedData.hospital_id,
      treatedData.hospital_name,
      treatedData.treating_doctor_id,
      treatedData.treating_doctor_name,
      treatedData.treatment_started_at,
      treatedData.treatment_completed_at || new Date().toISOString(),
      treatedData.treatment_duration_minutes,
      treatedData.treatment_notes,
      treatedData.treatment_outcome,
      treatedData.discharge_status || 'discharged',
      treatedData.follow_up_required || false,
      treatedData.follow_up_notes,
      treatedData.patient_satisfaction_rating
    ];

    db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        // Log the event
        logEvent('treatment_completed', 'treated_patient', treatedData.report_id, treatedData.treating_doctor_id, 'doctor', treatedData);
        resolve({ id: this.lastID, ...treatedData });
      }
    });
  });
};

export const getTreatedPatients = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT tp.*, h.name as hospital_name_current
      FROM treated_patients tp
      LEFT JOIN hospitals h ON tp.hospital_id = h.hospital_id
    `;

    // Handle filters if provided
    const conditions = [];
    const params = [];
    
    if (filters.hospital_id) {
      conditions.push('tp.hospital_id = ?');
      params.push(filters.hospital_id);
    }
    
    if (filters.treating_doctor_id) {
      conditions.push('tp.treating_doctor_id = ?');
      params.push(filters.treating_doctor_id);
    }
    
    if (filters.date_from) {
      conditions.push('tp.treatment_completed_at >= ?');
      params.push(filters.date_from);
    }
    
    if (filters.date_to) {
      conditions.push('tp.treatment_completed_at <= ?');
      params.push(filters.date_to);
    }
    
    if (filters.outcome) {
      conditions.push('tp.treatment_outcome = ?');
      params.push(filters.outcome);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY tp.treatment_completed_at DESC';

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const updateTreatedPatient = (reportId, updateData) => {
  return new Promise((resolve, reject) => {
    const setClause = [];
    const params = [];
    
    // Build dynamic update query
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        setClause.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });
    
    if (setClause.length === 0) {
      resolve({ report_id: reportId, changes: 0 });
      return;
    }
    
    params.push(reportId);
    
    const sql = `
      UPDATE treated_patients 
      SET ${setClause.join(', ')}
      WHERE report_id = ?
    `;

    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        logEvent('treated_patient_updated', 'treated_patient', reportId, null, null, updateData);
        resolve({ report_id: reportId, changes: this.changes });
      }
    });
  });
};

export const getTreatedPatientStats = (hospitalId = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        COUNT(*) as total_treated,
        AVG(treatment_duration_minutes) as avg_treatment_duration,
        AVG(patient_satisfaction_rating) as avg_satisfaction,
        COUNT(CASE WHEN follow_up_required = 1 THEN 1 END) as follow_up_required_count,
        treatment_outcome,
        COUNT(*) as outcome_count
      FROM treated_patients
    `;
    
    const params = [];
    
    if (hospitalId) {
      sql += ' WHERE hospital_id = ?';
      params.push(hospitalId);
    }
    
    sql += ' GROUP BY treatment_outcome';

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Get overall stats
        let overallSql = `
          SELECT 
            COUNT(*) as total_treated,
            AVG(treatment_duration_minutes) as avg_treatment_duration,
            AVG(patient_satisfaction_rating) as avg_satisfaction,
            COUNT(CASE WHEN follow_up_required = 1 THEN 1 END) as follow_up_required_count
          FROM treated_patients
        `;
        
        if (hospitalId) {
          overallSql += ' WHERE hospital_id = ?';
        }
        
        db.get(overallSql, params, (overallErr, overallStats) => {
          if (overallErr) {
            reject(overallErr);
          } else {
            resolve({
              overall: overallStats,
              by_outcome: rows
            });
          }
        });
      }
    });
  });
};

// Delete patient report and all related data
export const deletePatientReport = (reportId, userId = null, userRole = null) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Delete in reverse order of foreign key dependencies
      const deleteQueries = [
        'DELETE FROM notification_queue WHERE report_id = ?',
        'DELETE FROM treated_patients WHERE report_id = ?', 
        'DELETE FROM patient_queue WHERE report_id = ?',
        'DELETE FROM hospital_assignments WHERE report_id = ?',
        'DELETE FROM travel_estimates WHERE report_id = ?',
        'DELETE FROM triage_results WHERE report_id = ?',
        'DELETE FROM patient_reports WHERE report_id = ?'
      ];
      
      let completed = 0;
      const total = deleteQueries.length;
      let hasError = false;
      
      deleteQueries.forEach(sql => {
        db.run(sql, [reportId], function(err) {
          if (err && !hasError) {
            hasError = true;
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          completed++;
          if (completed === total && !hasError) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                reject(commitErr);
              } else {
                // Log the deletion event after successful transaction
                logEvent('patient_report_deleted', 'patient_report', reportId, userId, userRole, {
                  tables_affected: deleteQueries.length,
                  deleted_at: new Date().toISOString()
                });
                
                resolve({ 
                  report_id: reportId, 
                  deleted: true,
                  tables_affected: deleteQueries.length,
                  deleted_by: userId
                });
              }
            });
          }
        });
      });
    });
  });
};

export { db };
