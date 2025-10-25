import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'myspaceer_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Initialize PostgreSQL database schema
 */
export const initializePostgresDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Patient Reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_reports (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        age_range VARCHAR(20) NOT NULL,
        trn VARCHAR(50),
        incident_type VARCHAR(100) NOT NULL,
        incident_description TEXT,
        patient_status VARCHAR(50) NOT NULL,
        transportation_mode VARCHAR(50) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_address TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(50),
        assigned_doctor_id VARCHAR(50),
        assigned_doctor_name VARCHAR(255),
        doctor_assigned_at TIMESTAMP,
        doctor_released_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Created',
        submitted_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ai_processed INTEGER DEFAULT 0,
        ai_criticality VARCHAR(50),
        ai_confidence DECIMAL(5, 2),
        assigned_hospital_id VARCHAR(50),
        -- Vital Signs fields
        blood_pressure_systolic INTEGER,
        blood_pressure_diastolic INTEGER,
        heart_rate INTEGER,
        respiratory_rate INTEGER,
        oxygen_saturation INTEGER,
        temperature_celsius DECIMAL(4, 1),
        glasgow_coma_scale INTEGER,
        pain_level INTEGER,
        consciousness_level VARCHAR(50),
        has_allergies BOOLEAN DEFAULT FALSE,
        allergies_list TEXT,
        current_medications TEXT,
        medical_history TEXT,
        vital_signs_taken_at TIMESTAMP,
        vital_signs_abnormal BOOLEAN DEFAULT FALSE
      )
    `);

    // Create index on report_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_reports_report_id ON patient_reports(report_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_reports_status ON patient_reports(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_reports_hospital ON patient_reports(assigned_hospital_id)
    `);

    // Triage Results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS triage_results (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) NOT NULL REFERENCES patient_reports(report_id) ON DELETE CASCADE,
        criticality VARCHAR(50) NOT NULL,
        criticality_reason TEXT,
        confidence_score DECIMAL(5, 2),
        triage_method VARCHAR(50) DEFAULT 'deterministic',
        ml_features JSONB,
        processing_time_ms INTEGER,
        triaged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        overridden_by VARCHAR(255),
        override_reason TEXT,
        override_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_triage_results_report_id ON triage_results(report_id)
    `);

    // Hospitals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        specialties JSONB,
        capacity INTEGER DEFAULT 100,
        current_load INTEGER DEFAULT 0,
        average_treatment_time INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Travel Time Estimates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS travel_estimates (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) NOT NULL REFERENCES patient_reports(report_id) ON DELETE CASCADE,
        hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(hospital_id),
        estimated_time_seconds INTEGER NOT NULL,
        distance_meters INTEGER,
        traffic_factor DECIMAL(3, 1) DEFAULT 1.0,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        routing_provider VARCHAR(50) DEFAULT 'osrm'
      )
    `);

    // Hospital Assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospital_assignments (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) NOT NULL REFERENCES patient_reports(report_id) ON DELETE CASCADE,
        hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(hospital_id),
        assignment_score DECIMAL(5, 2),
        assignment_reason TEXT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hms_case_id VARCHAR(100),
        hms_encounter_id VARCHAR(100)
      )
    `);

    // Patient Queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_queue (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) NOT NULL REFERENCES patient_reports(report_id) ON DELETE CASCADE,
        hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(hospital_id),
        queue_position INTEGER NOT NULL,
        priority_score DECIMAL(5, 2) NOT NULL,
        estimated_wait_time INTEGER,
        queue_status VARCHAR(50) DEFAULT 'waiting',
        assigned_doctor_id VARCHAR(50),
        entered_queue_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_queue_hospital ON patient_queue(hospital_id, queue_status)
    `);

    // Doctor Shifts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_shifts (
        id SERIAL PRIMARY KEY,
        doctor_id VARCHAR(50) NOT NULL,
        hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(hospital_id),
        doctor_name VARCHAR(255) NOT NULL,
        specialties JSONB,
        shift_start TIME NOT NULL,
        shift_end TIME NOT NULL,
        max_concurrent_patients INTEGER DEFAULT 3,
        current_patient_count INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Event Log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_log (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        user_role VARCHAR(50),
        event_data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        correlation_id VARCHAR(100)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_log_entity ON event_log(entity_type, entity_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_log_timestamp ON event_log(timestamp DESC)
    `);

    // Notification Queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) NOT NULL,
        notification_type VARCHAR(100) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        updated_at TIMESTAMP,
        error_message TEXT
      )
    `);

    // Treated Patients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS treated_patients (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) NOT NULL REFERENCES patient_reports(report_id) ON DELETE CASCADE,
        patient_name VARCHAR(255) NOT NULL,
        trn VARCHAR(50),
        age_range VARCHAR(20) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        incident_type VARCHAR(100) NOT NULL,
        incident_description TEXT,
        original_criticality VARCHAR(50),
        hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(hospital_id),
        hospital_name VARCHAR(255) NOT NULL,
        treating_doctor_id VARCHAR(50),
        treating_doctor_name VARCHAR(255),
        treatment_started_at TIMESTAMP,
        treatment_completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        treatment_duration_minutes INTEGER,
        treatment_notes TEXT,
        treatment_outcome VARCHAR(100),
        discharge_status VARCHAR(50) DEFAULT 'discharged',
        follow_up_required BOOLEAN DEFAULT FALSE,
        follow_up_notes TEXT,
        patient_satisfaction_rating INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Triage Rules Configuration table
    await client.query(`
      CREATE TABLE IF NOT EXISTS triage_rules (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        rule_conditions JSONB NOT NULL,
        criticality_result VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL database schema created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating PostgreSQL schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Seed default data (hospitals, triage rules, doctor shifts)
 */
export const seedPostgresData = async () => {
  const client = await pool.connect();
  
  try {
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

    for (const hospital of hospitals) {
      await client.query(`
        INSERT INTO hospitals (hospital_id, name, address, latitude, longitude, specialties, capacity)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (hospital_id) DO NOTHING
      `, [hospital.hospital_id, hospital.name, hospital.address, hospital.latitude, hospital.longitude, hospital.specialties, hospital.capacity]);
    }

    // Insert default triage rules
    const triageRules = [
      {
        rule_name: 'Shooting + Unconscious = Severe',
        rule_conditions: JSON.stringify({ incident_type: 'shooting', patient_status: 'unconscious' }),
        criticality_result: 'severe',
        priority: 10
      },
      {
        rule_name: 'Motor Vehicle Accident + Age 51+ + Ambulance = High',
        rule_conditions: JSON.stringify({ incident_type: 'motor-vehicle-accident', age_range: '51+', transportation_mode: 'ambulance' }),
        criticality_result: 'high',
        priority: 8
      }
    ];

    for (const rule of triageRules) {
      await client.query(`
        INSERT INTO triage_rules (rule_name, rule_conditions, criticality_result, priority)
        VALUES ($1, $2::jsonb, $3, $4)
        ON CONFLICT DO NOTHING
      `, [rule.rule_name, rule.rule_conditions, rule.criticality_result, rule.priority]);
    }

    console.log('✅ PostgreSQL default data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding PostgreSQL data:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Query helper function
 */
export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`Executed query in ${duration}ms:`, { text, rows: res.rowCount });
  return res;
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async () => {
  return await pool.connect();
};

/**
 * Close all connections
 */
export const closePool = async () => {
  await pool.end();
  console.log('✅ PostgreSQL pool closed');
};

export default pool;
