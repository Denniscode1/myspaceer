#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import { join } from 'path';

const db = new sqlite3.Database(join('server', 'emergency_system.db'));

const patientId = 'RPT_1760909596534_GVZ8Z3XCY';

console.log(`🔍 Debugging patient: ${patientId}\n`);

// Check patient report
db.get('SELECT * FROM patient_reports WHERE report_id = ?', [patientId], (err, row) => {
  if (err) {
    console.error('Error getting patient report:', err);
  } else if (row) {
    console.log('📋 Patient Report:');
    console.log(`   Name: ${row.name}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Created: ${row.created_at}`);
    console.log(`   Updated: ${row.updated_at}`);
    console.log('');
  } else {
    console.log('❌ Patient report not found');
  }
});

// Check triage results
db.get('SELECT * FROM triage_results WHERE report_id = ?', [patientId], (err, row) => {
  if (err) {
    console.error('Error getting triage results:', err);
  } else if (row) {
    console.log('🏥 Triage Results:');
    console.log(`   Criticality: ${row.criticality}`);
    console.log(`   Confidence: ${row.confidence_score}`);
    console.log(`   Triaged At: ${row.triaged_at}`);
    console.log('');
  } else {
    console.log('❌ No triage results found');
  }
});

// Check hospital assignment
db.get('SELECT * FROM hospital_assignments WHERE report_id = ?', [patientId], (err, row) => {
  if (err) {
    console.error('Error getting hospital assignments:', err);
  } else if (row) {
    console.log('🏥 Hospital Assignment:');
    console.log(`   Hospital ID: ${row.hospital_id}`);
    console.log(`   Assigned At: ${row.assigned_at}`);
    console.log('');
  } else {
    console.log('❌ No hospital assignment found');
  }
});

// Check patient queue
db.get('SELECT * FROM patient_queue WHERE report_id = ?', [patientId], (err, row) => {
  if (err) {
    console.error('Error getting patient queue:', err);
  } else if (row) {
    console.log('📋 Patient Queue:');
    console.log(`   Hospital ID: ${row.hospital_id}`);
    console.log(`   Position: ${row.queue_position}`);
    console.log(`   Status: ${row.queue_status}`);
    console.log(`   Entered At: ${row.entered_queue_at}`);
    console.log('');
  } else {
    console.log('❌ Not found in patient queue');
  }
});

// Check queue management
db.get('SELECT * FROM queue_management WHERE report_id = ?', [patientId], (err, row) => {
  if (err) {
    console.error('Error getting queue management:', err);
  } else if (row) {
    console.log('📋 Queue Management:');
    console.log(`   Hospital ID: ${row.hospital_id}`);
    console.log(`   Position: ${row.queue_position}`);
    console.log(`   Criticality: ${row.criticality}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Created At: ${row.created_at}`);
    console.log('');
  } else {
    console.log('❌ Not found in queue management');
  }
});

// Check event log for this patient
db.all('SELECT * FROM event_log WHERE entity_id = ? ORDER BY timestamp DESC LIMIT 10', [patientId], (err, rows) => {
  if (err) {
    console.error('Error getting event log:', err);
  } else if (rows && rows.length > 0) {
    console.log('📝 Recent Events:');
    rows.forEach(event => {
      console.log(`   ${event.timestamp}: ${event.event_type} - ${event.entity_type}`);
    });
    console.log('');
  } else {
    console.log('❌ No events found in log');
  }
  
  db.close();
});