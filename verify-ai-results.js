#!/usr/bin/env node

/**
 * Verification Script - Check AI Queue Manager Results
 */

import { initializeEnhancedDatabase, getPatientReports, getHospitals } from './server/database-enhanced.js';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'server', 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

async function verifyAIResults() {
  console.log('🔍 Verifying AI Queue Manager Results\n');
  
  try {
    await initializeEnhancedDatabase();
    
    // Check processed patients
    console.log('1️⃣ AI Processed Patients:\n');
    
    const processedPatients = await new Promise((resolve, reject) => {
      db.all(`
        SELECT pr.report_id, pr.name, pr.ai_processed, pr.ai_criticality, 
               pr.ai_confidence, pr.assigned_hospital_id, pr.incident_type,
               pr.incident_description, h.name as hospital_name
        FROM patient_reports pr
        LEFT JOIN hospitals h ON pr.assigned_hospital_id = h.hospital_id
        WHERE pr.ai_processed = 1
        ORDER BY pr.created_at DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (processedPatients.length > 0) {
      processedPatients.forEach(patient => {
        console.log(`👤 ${patient.name}`);
        console.log(`   🎯 AI Criticality: ${patient.ai_criticality || 'Not set'}`);
        console.log(`   🎲 AI Confidence: ${patient.ai_confidence ? (patient.ai_confidence * 100).toFixed(1) + '%' : 'Not set'}`);
        console.log(`   🏥 Assigned Hospital: ${patient.hospital_name || 'Not assigned'}`);
        console.log(`   📋 Incident: ${patient.incident_type}`);
        console.log(`   📝 Description: ${patient.incident_description?.substring(0, 80)}...`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No AI-processed patients found');
    }

    // Check queue management table
    console.log('2️⃣ Queue Management Status:\n');
    
    const queueItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT qm.*, pr.name, h.name as hospital_name
        FROM queue_management qm
        JOIN patient_reports pr ON qm.report_id = pr.report_id
        JOIN hospitals h ON qm.hospital_id = h.hospital_id
        ORDER BY h.name, qm.queue_position
        LIMIT 15
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (queueItems.length > 0) {
      let currentHospital = '';
      queueItems.forEach(item => {
        if (item.hospital_name !== currentHospital) {
          currentHospital = item.hospital_name;
          console.log(`🏥 ${currentHospital} Queue:`);
        }
        console.log(`   ${item.queue_position}. ${item.name} (${item.criticality || 'No criticality'})`);
        console.log(`      Wait: ${item.estimated_wait_time ? Math.round(item.estimated_wait_time / 60) + ' min' : 'N/A'}`);
        console.log(`      Confidence: ${item.ai_confidence ? (item.ai_confidence * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No items in queue management table');
    }

    // Check hospital assignments
    console.log('3️⃣ Hospital Statistics:\n');
    
    const hospitalStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT h.name, h.hospital_id,
               COUNT(qm.id) as queue_count,
               COUNT(CASE WHEN qm.criticality = 'Critical' THEN 1 END) as critical_count,
               COUNT(CASE WHEN qm.criticality = 'High' THEN 1 END) as high_count,
               COUNT(CASE WHEN qm.criticality = 'Moderate' THEN 1 END) as moderate_count,
               COUNT(CASE WHEN qm.criticality = 'Low' THEN 1 END) as low_count
        FROM hospitals h
        LEFT JOIN queue_management qm ON h.hospital_id = qm.hospital_id
        GROUP BY h.hospital_id, h.name
        ORDER BY queue_count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    hospitalStats.forEach(hospital => {
      console.log(`🏥 ${hospital.name}`);
      console.log(`   📊 Total in Queue: ${hospital.queue_count}`);
      if (hospital.queue_count > 0) {
        console.log(`   🔴 Critical: ${hospital.critical_count}`);
        console.log(`   🟡 High: ${hospital.high_count}`);
        console.log(`   🟢 Moderate: ${hospital.moderate_count}`);
        console.log(`   🔵 Low: ${hospital.low_count}`);
      }
      console.log('');
    });

    console.log('✅ AI Queue Manager Verification Complete!');
    console.log(`📈 Total AI-Processed Patients: ${processedPatients.length}`);
    console.log(`📋 Total Queue Items: ${queueItems.length}`);
    console.log(`🏥 Active Hospitals: ${hospitalStats.length}`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    db.close();
  }
}

verifyAIResults().catch(console.error);