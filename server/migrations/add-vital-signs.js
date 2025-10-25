import { db, initializeEnhancedDatabase } from '../database-enhanced.js';

/**
 * Migration: Add vital signs tracking to patient reports
 * Adds clinical data fields for better triage accuracy
 */
export const addVitalSignsFields = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('📊 Adding vital signs fields to patient_reports...');

      // Add vital signs columns
      const vitalSignsColumns = [
        'ALTER TABLE patient_reports ADD COLUMN blood_pressure_systolic INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN blood_pressure_diastolic INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN heart_rate INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN respiratory_rate INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN oxygen_saturation INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN temperature_celsius REAL',
        'ALTER TABLE patient_reports ADD COLUMN glasgow_coma_scale INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN pain_level INTEGER',
        'ALTER TABLE patient_reports ADD COLUMN consciousness_level TEXT',
        'ALTER TABLE patient_reports ADD COLUMN has_allergies BOOLEAN DEFAULT 0',
        'ALTER TABLE patient_reports ADD COLUMN allergies_list TEXT',
        'ALTER TABLE patient_reports ADD COLUMN current_medications TEXT',
        'ALTER TABLE patient_reports ADD COLUMN medical_history TEXT',
        'ALTER TABLE patient_reports ADD COLUMN vital_signs_taken_at DATETIME',
        'ALTER TABLE patient_reports ADD COLUMN vital_signs_abnormal BOOLEAN DEFAULT 0'
      ];

      let completed = 0;
      let errors = [];

      vitalSignsColumns.forEach((sql) => {
        db.run(sql, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.warn(`⚠️  ${err.message}`);
            errors.push(err.message);
          }
          completed++;
          
          if (completed === vitalSignsColumns.length) {
            if (errors.length === 0 || errors.every(e => e.includes('duplicate'))) {
              console.log('✅ Vital signs fields added successfully');
              resolve();
            } else {
              reject(new Error(`Migration failed: ${errors.join(', ')}`));
            }
          }
        });
      });
    });
  });
};

/**
 * Rollback: Remove vital signs fields
 */
export const removeVitalSignsFields = () => {
  return new Promise((resolve, reject) => {
    console.log('⚠️  Rolling back vital signs migration...');
    
    // SQLite doesn't support DROP COLUMN directly
    // Would need to recreate the table without these columns
    console.log('⚠️  Rollback not supported for SQLite. Manual intervention required.');
    resolve();
  });
};

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔄 Starting vital signs migration...');
  initializeEnhancedDatabase()
    .then(() => {
      console.log('✅ Database initialized');
      return addVitalSignsFields();
    })
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
