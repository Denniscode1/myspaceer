import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../emergency_system.db');
const db = new sqlite3.Database(dbPath);

/**
 * Migration: Add HIPAA Compliance Fields
 * - Adds consent management fields
 * - Adds vital signs and clinical fields
 * - Creates immutable audit log
 * - Creates data access log
 * - Creates clinical red flags table
 * - Creates patient report history
 */

console.log('🔄 Starting HIPAA Compliance Migration...');

db.serialize(() => {
  // ==========================================
  // 1. Add Consent Management Fields
  // ==========================================
  console.log('📋 Adding consent management fields...');
  
  const consentFields = [
    'ALTER TABLE patient_reports ADD COLUMN consent_data_storage BOOLEAN DEFAULT 0',
    'ALTER TABLE patient_reports ADD COLUMN consent_location_tracking BOOLEAN DEFAULT 0',
    'ALTER TABLE patient_reports ADD COLUMN consent_communication BOOLEAN DEFAULT 0',
    'ALTER TABLE patient_reports ADD COLUMN consent_timestamp DATETIME',
    'ALTER TABLE patient_reports ADD COLUMN consent_ip_address TEXT',
  ];
  
  consentFields.forEach(sql => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding consent field:', err.message);
      }
    });
  });
  
  // ==========================================
  // 2. Add Clinical & Vital Signs Fields
  // ==========================================
  console.log('🏥 Adding clinical and vital signs fields...');
  
  const clinicalFields = [
    'ALTER TABLE patient_reports ADD COLUMN vital_signs TEXT', // JSON: BP, HR, RR, SpO2, Temp
    'ALTER TABLE patient_reports ADD COLUMN pain_score INTEGER CHECK(pain_score >= 0 AND pain_score <= 10)',
    'ALTER TABLE patient_reports ADD COLUMN allergies TEXT',
    'ALTER TABLE patient_reports ADD COLUMN current_medications TEXT',
    'ALTER TABLE patient_reports ADD COLUMN chronic_conditions TEXT',
    'ALTER TABLE patient_reports ADD COLUMN previous_hospitalizations TEXT',
    'ALTER TABLE patient_reports ADD COLUMN medical_history_notes TEXT',
  ];
  
  clinicalFields.forEach(sql => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding clinical field:', err.message);
      }
    });
  });
  
  // ==========================================
  // 3. Create Immutable Audit Log
  // ==========================================
  console.log('🔐 Creating immutable audit log...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS immutable_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_hash TEXT UNIQUE NOT NULL,
      previous_log_hash TEXT,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      user_ip TEXT,
      action_performed TEXT NOT NULL,
      data_before TEXT,
      data_after TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (previous_log_hash) REFERENCES immutable_audit_log(log_hash)
    )
  `, (err) => {
    if (err) console.error('Error creating immutable_audit_log:', err.message);
    else console.log('✅ Immutable audit log created');
  });
  
  // Create triggers to prevent modification/deletion
  db.run(`
    CREATE TRIGGER IF NOT EXISTS prevent_audit_log_modification
    BEFORE UPDATE ON immutable_audit_log
    BEGIN
      SELECT RAISE(FAIL, 'Audit log records cannot be modified');
    END
  `);
  
  db.run(`
    CREATE TRIGGER IF NOT EXISTS prevent_audit_log_deletion
    BEFORE DELETE ON immutable_audit_log
    BEGIN
      SELECT RAISE(FAIL, 'Audit log records cannot be deleted');
    END
  `);
  
  // ==========================================
  // 4. Create Data Access Log
  // ==========================================
  console.log('👁️ Creating data access log...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS data_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      patient_report_id TEXT NOT NULL,
      access_type TEXT NOT NULL,
      fields_accessed TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_report_id) REFERENCES patient_reports(report_id)
    )
  `, (err) => {
    if (err) console.error('Error creating data_access_log:', err.message);
    else console.log('✅ Data access log created');
  });
  
  // Create index for fast queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_data_access_user 
    ON data_access_log(user_id, timestamp DESC)
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_data_access_patient 
    ON data_access_log(patient_report_id, timestamp DESC)
  `);
  
  // ==========================================
  // 5. Create Clinical Red Flags Table
  // ==========================================
  console.log('🚨 Creating clinical red flags table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS clinical_red_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      flag_type TEXT NOT NULL,
      flag_description TEXT NOT NULL,
      severity TEXT NOT NULL,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged_by TEXT,
      acknowledged_at DATETIME,
      FOREIGN KEY (report_id) REFERENCES patient_reports(report_id)
    )
  `, (err) => {
    if (err) console.error('Error creating clinical_red_flags:', err.message);
    else console.log('✅ Clinical red flags table created');
  });
  
  // ==========================================
  // 6. Create Patient Report History (Versioning)
  // ==========================================
  console.log('📜 Creating patient report history...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS patient_report_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      change_reason TEXT,
      FOREIGN KEY (report_id) REFERENCES patient_reports(report_id)
    )
  `, (err) => {
    if (err) console.error('Error creating patient_report_history:', err.message);
    else console.log('✅ Patient report history created');
  });
  
  // Create trigger for automatic versioning on updates
  db.run(`
    CREATE TRIGGER IF NOT EXISTS patient_report_versioning
    AFTER UPDATE ON patient_reports
    FOR EACH ROW
    BEGIN
      INSERT INTO patient_report_history (report_id, version, snapshot, changed_by, changed_at)
      VALUES (
        NEW.report_id,
        COALESCE((SELECT MAX(version) FROM patient_report_history WHERE report_id = NEW.report_id), 0) + 1,
        json_object(
          'name', OLD.name,
          'gender', OLD.gender,
          'age_range', OLD.age_range,
          'trn', OLD.trn,
          'incident_type', OLD.incident_type,
          'incident_description', OLD.incident_description,
          'patient_status', OLD.patient_status,
          'status', OLD.status,
          'contact_email', OLD.contact_email,
          'contact_phone', OLD.contact_phone
        ),
        'system',
        CURRENT_TIMESTAMP
      );
    END
  `, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('Error creating versioning trigger:', err.message);
    }
  });
  
  // ==========================================
  // 7. Create MFA Table for Medical Staff
  // ==========================================
  console.log('🔑 Creating MFA table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS medical_staff_mfa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      mfa_secret TEXT NOT NULL,
      backup_codes TEXT,
      enabled BOOLEAN DEFAULT 0,
      enabled_at DATETIME,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating medical_staff_mfa:', err.message);
    else console.log('✅ MFA table created');
  });
  
  // ==========================================
  // 8. Create Notification Delivery Log
  // ==========================================
  console.log('📨 Creating notification delivery log...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_delivery_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id INTEGER NOT NULL,
      delivery_channel TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      delivery_provider TEXT,
      provider_message_id TEXT,
      provider_response TEXT,
      attempt_number INTEGER DEFAULT 1,
      sent_at DATETIME,
      delivered_at DATETIME,
      failed_at DATETIME,
      error_message TEXT,
      FOREIGN KEY (notification_id) REFERENCES notification_queue(id)
    )
  `, (err) => {
    if (err) console.error('Error creating notification_delivery_log:', err.message);
    else console.log('✅ Notification delivery log created');
  });
  
  // ==========================================
  // Final Steps
  // ==========================================
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) console.error('Error enabling foreign keys:', err.message);
  });
  
  console.log('\n✅ HIPAA Compliance Migration Complete!');
  console.log('📊 Summary:');
  console.log('   ✓ Consent management fields added');
  console.log('   ✓ Clinical & vital signs fields added');
  console.log('   ✓ Immutable audit log created');
  console.log('   ✓ Data access log created');
  console.log('   ✓ Clinical red flags table created');
  console.log('   ✓ Patient report history created');
  console.log('   ✓ MFA support added');
  console.log('   ✓ Notification delivery tracking added');
  console.log('\n⚠️  IMPORTANT: Update your .env file with ENCRYPTION_KEY');
  console.log('   Generate key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  
  db.close();
});
