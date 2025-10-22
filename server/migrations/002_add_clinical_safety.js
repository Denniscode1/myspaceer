/**
 * Migration 002: Clinical Safety Features
 * 
 * Adds clinical safety features to support:
 * - ESI triage scoring
 * - Red flag detection
 * - Clinical assessments
 * - Detailed vital signs tracking
 */

export default {
  up: async (db) => {
    console.log('Running migration 002: Clinical Safety Features...');

    // Add ESI triage fields to patient_reports
    console.log('Adding ESI triage columns...');
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN esi_level INTEGER CHECK (esi_level BETWEEN 1 AND 5)
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN esi_category TEXT
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN esi_priority TEXT
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN esi_reasoning TEXT
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN esi_timestamp TEXT
    `);

    // Add red flag tracking
    console.log('Adding red flag columns...');
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN red_flags_critical INTEGER DEFAULT 0
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN red_flags_warning INTEGER DEFAULT 0
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN red_flags_summary TEXT
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN requires_immediate_attention BOOLEAN DEFAULT 0
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN requires_clinical_review BOOLEAN DEFAULT 0
    `);

    // Add clinical assessment tracking
    console.log('Adding clinical assessment columns...');
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN clinical_assessment_completed BOOLEAN DEFAULT 0
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN clinical_assessment_timestamp TEXT
    `);
    
    await db.run(`
      ALTER TABLE patient_reports 
      ADD COLUMN notification_priority TEXT
    `);

    // Create detailed red_flags table for comprehensive tracking
    console.log('Creating red_flags table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS red_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        flag_type TEXT NOT NULL CHECK (flag_type IN ('CRITICAL', 'WARNING')),
        category TEXT NOT NULL,
        parameter TEXT NOT NULL,
        value TEXT,
        unit TEXT,
        threshold TEXT,
        message TEXT NOT NULL,
        clinical_significance TEXT,
        immediate_actions TEXT,
        recommended_actions TEXT,
        detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        
        FOREIGN KEY (report_id) REFERENCES patient_reports(id) ON DELETE CASCADE
      )
    `);

    // Create clinical_recommendations table
    console.log('Creating clinical_recommendations table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS clinical_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('immediate', 'monitoring', 'investigations', 'consultations', 'disposition')),
        recommendation TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        completed_at TEXT,
        completed_by INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        
        FOREIGN KEY (report_id) REFERENCES patient_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (completed_by) REFERENCES medical_staff(id)
      )
    `);

    // Create clinical_assessments table for full assessment history
    console.log('Creating clinical_assessments table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS clinical_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        assessment_version TEXT NOT NULL,
        
        -- ESI Data
        esi_level INTEGER NOT NULL,
        esi_category TEXT NOT NULL,
        esi_priority TEXT NOT NULL,
        esi_reasoning TEXT,
        esi_validation_warnings TEXT,
        
        -- Red Flags Data
        red_flags_critical_count INTEGER DEFAULT 0,
        red_flags_warning_count INTEGER DEFAULT 0,
        red_flags_summary TEXT,
        
        -- Clinical Summary
        clinical_summary TEXT,
        notification_priority TEXT,
        requires_immediate_attention BOOLEAN DEFAULT 0,
        requires_clinical_review BOOLEAN DEFAULT 0,
        
        -- Assessment metadata
        assessed_by INTEGER,
        assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
        
        FOREIGN KEY (report_id) REFERENCES patient_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (assessed_by) REFERENCES medical_staff(id)
      )
    `);

    // Create vital_signs_history table for tracking vital sign changes
    console.log('Creating vital_signs_history table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS vital_signs_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        
        -- Vital Signs
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        heart_rate INTEGER,
        respiratory_rate INTEGER,
        oxygen_saturation INTEGER,
        temperature REAL,
        
        -- Context
        measured_by INTEGER,
        measured_at TEXT NOT NULL DEFAULT (datetime('now')),
        notes TEXT,
        location TEXT,
        
        FOREIGN KEY (report_id) REFERENCES patient_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (measured_by) REFERENCES medical_staff(id)
      )
    `);

    // Create indexes for performance
    console.log('Creating indexes...');
    await db.run('CREATE INDEX idx_red_flags_report_id ON red_flags(report_id)');
    await db.run('CREATE INDEX idx_red_flags_type ON red_flags(flag_type)');
    await db.run('CREATE INDEX idx_clinical_recommendations_report_id ON clinical_recommendations(report_id)');
    await db.run('CREATE INDEX idx_clinical_recommendations_category ON clinical_recommendations(category)');
    await db.run('CREATE INDEX idx_clinical_assessments_report_id ON clinical_assessments(report_id)');
    await db.run('CREATE INDEX idx_clinical_assessments_esi_level ON clinical_assessments(esi_level)');
    await db.run('CREATE INDEX idx_vital_signs_history_report_id ON vital_signs_history(report_id)');
    await db.run('CREATE INDEX idx_patient_reports_esi_level ON patient_reports(esi_level)');
    await db.run('CREATE INDEX idx_patient_reports_immediate_attention ON patient_reports(requires_immediate_attention)');

    console.log('Migration 002 completed successfully!');
  },

  down: async (db) => {
    console.log('Rolling back migration 002: Clinical Safety Features...');

    // Drop tables
    await db.run('DROP TABLE IF EXISTS vital_signs_history');
    await db.run('DROP TABLE IF EXISTS clinical_assessments');
    await db.run('DROP TABLE IF EXISTS clinical_recommendations');
    await db.run('DROP TABLE IF EXISTS red_flags');

    // Note: SQLite doesn't support DROP COLUMN easily
    // In production, you would recreate the table without these columns
    console.log('Note: Column removal not fully implemented (SQLite limitation)');
    console.log('Patient_reports table columns remain but are unused');

    console.log('Migration 002 rollback completed!');
  },
};
