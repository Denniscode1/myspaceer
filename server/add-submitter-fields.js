import { db } from './database-enhanced.js';

/**
 * Database Migration: Add Submitter Contact Fields
 * This allows anyone who submits a patient report to receive notifications
 */

console.log('🔧 Adding submitter contact fields to patient_reports table...');

const migrations = [
  {
    name: 'Add submitter_name field',
    sql: `ALTER TABLE patient_reports ADD COLUMN submitter_name TEXT`
  },
  {
    name: 'Add submitter_phone field', 
    sql: `ALTER TABLE patient_reports ADD COLUMN submitter_phone TEXT`
  },
  {
    name: 'Add submitter_email field',
    sql: `ALTER TABLE patient_reports ADD COLUMN submitter_email TEXT`
  },
  {
    name: 'Add submitter_relationship field',
    sql: `ALTER TABLE patient_reports ADD COLUMN submitter_relationship TEXT`
  }
];

async function runMigration(migration) {
  return new Promise((resolve, reject) => {
    db.run(migration.sql, function(err) {
      if (err) {
        // Check if column already exists (error code 1 = duplicate column)
        if (err.message.includes('duplicate column name')) {
          console.log(`⚠️  ${migration.name}: Column already exists`);
          resolve();
        } else {
          console.error(`❌ ${migration.name} failed:`, err.message);
          reject(err);
        }
      } else {
        console.log(`✅ ${migration.name}: Success`);
        resolve();
      }
    });
  });
}

async function runAllMigrations() {
  console.log('🚀 Starting database migration...\n');
  
  try {
    for (const migration of migrations) {
      await runMigration(migration);
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📋 New fields added to patient_reports table:');
    console.log('   - submitter_name: Name of person submitting the report');
    console.log('   - submitter_phone: Phone number for notifications');
    console.log('   - submitter_email: Email address for notifications');
    console.log('   - submitter_relationship: Relationship to patient (EMT, family, etc.)');
    
    console.log('\n📱 Now anyone who submits a report can receive notifications about:');
    console.log('   - Queue position updates');
    console.log('   - Treatment status changes');
    console.log('   - Treatment ready alerts');
    console.log('   - Treatment completion notices');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the migration
runAllMigrations();