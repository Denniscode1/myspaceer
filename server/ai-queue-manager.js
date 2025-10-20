import { 
  initializeEnhancedDatabase, 
  getPatientReports, 
  getHospitals,
  saveTravelEstimate 
} from './database-enhanced.js';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

/**
 * AI-Powered Queue Management System
 * Automatically processes patient records and manages queue placement
 */

class AIQueueManager {
  constructor() {
    this.triageRules = {
      critical: {
        keywords: ['unconscious', 'shooting', 'cardiac arrest', 'stroke', 'severe bleeding', 'cardiac', 'heart attack'],
        statusKeywords: ['unconscious', 'critical', 'unresponsive'],
        incidentTypes: ['shooting', 'stabbing', 'heart-attack', 'stroke'],
        priority: 1,
        maxWaitTime: 0,
        criticality: 'Critical'
      },
      high: {
        keywords: ['chest pain', 'difficulty breathing', 'head trauma', 'severe pain', 'broken bone'],
        statusKeywords: ['conscious', 'alert'],
        incidentTypes: ['motor-vehicle-accident', 'fall', 'assault'],
        priority: 2,
        maxWaitTime: 300, // 5 minutes
        criticality: 'High'
      },
      moderate: {
        keywords: ['laceration', 'sprain', 'minor bleeding', 'nausea', 'fever'],
        statusKeywords: ['conscious', 'stable'],
        incidentTypes: ['other', 'slip-and-fall'],
        priority: 3,
        maxWaitTime: 1800, // 30 minutes
        criticality: 'Moderate'
      },
      low: {
        keywords: ['minor cut', 'bruise', 'headache', 'cold symptoms'],
        statusKeywords: ['conscious', 'walking'],
        incidentTypes: ['other'],
        priority: 4,
        maxWaitTime: 3600, // 60 minutes
        criticality: 'Low'
      }
    };
    
    this.hospitalCapacities = new Map();
    this.queueData = new Map();
  }

  /**
   * Initialize the AI Queue Manager
   */
  async initialize() {
    try {
      await initializeEnhancedDatabase();
      await this.loadHospitalData();
      await this.loadCurrentQueues();
      console.log('🤖 AI Queue Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Main function - Process new patients and add to queues
   */
  async processNewPatients() {
    console.log('🔍 AI Queue Manager: Scanning for new patients...\n');
    
    try {
      // Get all unprocessed patients
      const newPatients = await this.getUnprocessedPatients();
      
      if (newPatients.length === 0) {
        console.log('✅ No new patients to process');
        return;
      }

      console.log(`📋 Found ${newPatients.length} new patients to process:\n`);

      for (const patient of newPatients) {
        console.log(`🤖 Processing: ${patient.name}`);
        
        // AI Analysis
        const aiAnalysis = await this.analyzePatient(patient);
        console.log(`   📊 AI Analysis: ${aiAnalysis.criticality} priority`);
        console.log(`   🏥 Recommended Hospital: ${aiAnalysis.recommendedHospital.name}`);
        console.log(`   ⏱️  Estimated Wait: ${Math.round(aiAnalysis.estimatedWaitTime / 60)} minutes`);
        
        // Add to queue
        await this.addPatientToQueue(patient, aiAnalysis);
        
        // Update patient record with AI analysis
        await this.updatePatientWithAIData(patient, aiAnalysis);
        
        console.log(`   ✅ Added to ${aiAnalysis.recommendedHospital.name} queue\n`);
      }

      console.log(`🎉 Successfully processed ${newPatients.length} patients`);
      
    } catch (error) {
      console.error('❌ Error processing patients:', error);
    }
  }

  /**
   * AI Analysis of patient data
   */
  async analyzePatient(patient) {
    // Extract features for analysis
    const features = this.extractPatientFeatures(patient);
    
    // Determine criticality using NLP and rule-based approach
    const criticality = this.determineCriticality(patient);
    
    // Find optimal hospital
    const recommendedHospital = await this.findOptimalHospital(patient, criticality);
    
    // Calculate estimated wait time
    const estimatedWaitTime = this.calculateEstimatedWaitTime(recommendedHospital, criticality);
    
    // AI confidence score
    const confidence = this.calculateConfidenceScore(features, criticality);

    return {
      criticality: criticality.level,
      priority: criticality.priority,
      recommendedHospital,
      estimatedWaitTime,
      confidence,
      reasoning: criticality.reasoning,
      features
    };
  }

  /**
   * Extract features from patient data for AI analysis
   */
  extractPatientFeatures(patient) {
    const description = (patient.incident_description || '').toLowerCase();
    const status = (patient.patient_status || '').toLowerCase();
    const incidentType = patient.incident_type || '';
    const age = patient.age_range || '';
    const transportation = patient.transportation_mode || '';

    return {
      hasKeywords: this.findMatchingKeywords(description),
      statusSeverity: this.analyzePatientStatus(status),
      incidentSeverity: this.analyzeIncidentType(incidentType),
      ageRisk: this.analyzeAgeRisk(age),
      transportationUrgency: this.analyzeTransportation(transportation),
      locationRisk: this.analyzeLocation(patient.latitude, patient.longitude)
    };
  }

  /**
   * Determine criticality using AI rules
   */
  determineCriticality(patient) {
    const description = (patient.incident_description || '').toLowerCase();
    const status = (patient.patient_status || '').toLowerCase();
    const incidentType = patient.incident_type || '';

    let maxPriority = 4;
    let matchedRule = null;
    let reasoning = [];

    for (const [level, rule] of Object.entries(this.triageRules)) {
      let score = 0;
      
      // Check keywords in description
      const keywordMatches = rule.keywords.filter(keyword => 
        description.includes(keyword)
      );
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 2;
        reasoning.push(`Keywords: ${keywordMatches.join(', ')}`);
      }

      // Check patient status
      const statusMatches = rule.statusKeywords.filter(statusKeyword => 
        status.includes(statusKeyword)
      );
      if (statusMatches.length > 0) {
        score += statusMatches.length;
        reasoning.push(`Status: ${statusMatches.join(', ')}`);
      }

      // Check incident type
      if (rule.incidentTypes.includes(incidentType)) {
        score += 3;
        reasoning.push(`Incident: ${incidentType}`);
      }

      // If this rule has a better (lower) priority and matches
      if (score > 0 && rule.priority < maxPriority) {
        maxPriority = rule.priority;
        matchedRule = rule;
      }
    }

    return {
      level: matchedRule ? matchedRule.criticality : 'Moderate',
      priority: maxPriority,
      maxWaitTime: matchedRule ? matchedRule.maxWaitTime : 1800,
      reasoning: reasoning.length > 0 ? reasoning : ['Standard triage assessment']
    };
  }

  /**
   * Find optimal hospital using AI logic
   */
  async findOptimalHospital(patient, criticality) {
    const hospitals = await getHospitals();
    
    if (!patient.latitude || !patient.longitude) {
      return hospitals[0]; // Default to first hospital
    }

    let bestHospital = null;
    let bestScore = -1;

    for (const hospital of hospitals) {
      // Calculate distance
      const distance = this.calculateDistance(
        { lat: patient.latitude, lng: patient.longitude },
        { lat: hospital.latitude, lng: hospital.longitude }
      );

      // Calculate travel time
      const travelTime = this.estimateTravelTime(distance);
      
      // Get current queue load
      const queueLoad = await this.getHospitalQueueLoad(hospital.hospital_id);
      
      // AI scoring algorithm
      let score = 0;
      
      // Distance factor (closer is better)
      score += Math.max(0, 100 - (distance / 1000) * 5);
      
      // Queue load factor (less busy is better)
      score += Math.max(0, 50 - queueLoad * 10);
      
      // Critical patients prefer specialized hospitals
      if (criticality.level === 'Critical' && hospital.name.includes('University')) {
        score += 30;
      }
      
      // Travel time factor
      score += Math.max(0, 30 - (travelTime / 60) * 2);

      if (score > bestScore) {
        bestScore = score;
        bestHospital = hospital;
      }
    }

    return bestHospital || hospitals[0];
  }

  /**
   * Calculate estimated wait time based on queue and criticality
   */
  calculateEstimatedWaitTime(hospital, criticality) {
    const baseWaitTime = criticality.maxWaitTime || 1800; // 30 minutes default
    const queueLoad = this.hospitalCapacities.get(hospital.hospital_id) || 0;
    
    // Adjust based on current queue
    const queueFactor = Math.max(1, queueLoad * 0.2);
    
    return Math.round(baseWaitTime * queueFactor);
  }

  /**
   * Add patient to hospital queue
   */
  async addPatientToQueue(patient, aiAnalysis) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get the next available queue position for this hospital
        const nextPosition = await this.getNextQueuePosition(aiAnalysis.recommendedHospital.hospital_id);
        
        const queueData = {
          report_id: patient.report_id,
          hospital_id: aiAnalysis.recommendedHospital.hospital_id,
          queue_position: nextPosition,
          criticality: aiAnalysis.criticality,
          estimated_wait_time: aiAnalysis.estimatedWaitTime,
          ai_confidence: aiAnalysis.confidence,
          ai_reasoning: JSON.stringify(aiAnalysis.reasoning),
          created_at: new Date().toISOString()
        };

        db.run(`
          INSERT OR REPLACE INTO queue_management 
          (report_id, hospital_id, queue_position, criticality, estimated_wait_time, 
           ai_confidence, ai_reasoning, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          queueData.report_id,
          queueData.hospital_id,
          queueData.queue_position,
          queueData.criticality,
          queueData.estimated_wait_time,
          queueData.ai_confidence,
          queueData.ai_reasoning,
          queueData.created_at
        ], (err) => {
          if (err) {
            reject(err);
          } else {
            // Recalculate queue positions based on priority
            this.recalculateQueuePositions(aiAnalysis.recommendedHospital.hospital_id)
              .then(() => resolve())
              .catch(reject);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get the next available queue position for a hospital
   */
  async getNextQueuePosition(hospitalId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position 
        FROM queue_management 
        WHERE hospital_id = ? AND status = 'waiting'
      `, [hospitalId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.next_position || 1);
        }
      });
    });
  }

  /**
   * Update patient record with AI analysis data
   */
  async updatePatientWithAIData(patient, aiAnalysis) {
    return new Promise((resolve) => {
      db.run(`
        UPDATE patient_reports 
        SET ai_processed = 1,
            ai_criticality = ?,
            ai_confidence = ?,
            assigned_hospital_id = ?,
            updated_at = ?
        WHERE report_id = ?
      `, [
        aiAnalysis.criticality,
        aiAnalysis.confidence,
        aiAnalysis.recommendedHospital.hospital_id,
        new Date().toISOString(),
        patient.report_id
      ], resolve);
    });
  }

  /**
   * Get unprocessed patients
   */
  async getUnprocessedPatients() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM patient_reports 
        WHERE (ai_processed IS NULL OR ai_processed = 0)
        AND created_at >= datetime('now', '-1 hour')
        ORDER BY created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Helper functions
   */
  findMatchingKeywords(text) {
    const allKeywords = Object.values(this.triageRules)
      .flatMap(rule => rule.keywords);
    return allKeywords.filter(keyword => text.includes(keyword));
  }

  analyzePatientStatus(status) {
    const criticalStatuses = ['unconscious', 'critical', 'unresponsive'];
    const stableStatuses = ['conscious', 'alert', 'stable'];
    
    if (criticalStatuses.some(s => status.includes(s))) return 'critical';
    if (stableStatuses.some(s => status.includes(s))) return 'stable';
    return 'unknown';
  }

  analyzeIncidentType(incidentType) {
    const severityMap = {
      'shooting': 5,
      'stabbing': 5,
      'heart-attack': 5,
      'stroke': 5,
      'motor-vehicle-accident': 4,
      'fall': 3,
      'assault': 3,
      'other': 2
    };
    return severityMap[incidentType] || 2;
  }

  analyzeAgeRisk(ageRange) {
    const riskMap = {
      '0-10': 3,
      '11-30': 1,
      '31-50': 1,
      '51+': 3
    };
    return riskMap[ageRange] || 1;
  }

  analyzeTransportation(mode) {
    const urgencyMap = {
      'ambulance': 3,
      'police': 2,
      'self-carry': 1,
      'other': 1
    };
    return urgencyMap[mode] || 1;
  }

  analyzeLocation(lat, lng) {
    // Simple risk analysis based on location
    // This could be enhanced with crime data, traffic patterns, etc.
    return 1; // Default neutral risk
  }

  calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  estimateTravelTime(distanceMeters) {
    const speedKmh = 25; // Average speed in Kingston
    const distanceKm = distanceMeters / 1000;
    return (distanceKm / speedKmh) * 3600; // seconds
  }

  calculateConfidenceScore(features, criticality) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence with more keyword matches
    if (features.hasKeywords.length > 0) {
      confidence += features.hasKeywords.length * 0.1;
    }
    
    // Higher confidence with clear status indicators
    if (features.statusSeverity !== 'unknown') {
      confidence += 0.2;
    }
    
    // Cap at 1.0
    return Math.min(1.0, confidence);
  }

  async loadHospitalData() {
    const hospitals = await getHospitals();
    for (const hospital of hospitals) {
      this.hospitalCapacities.set(hospital.hospital_id, 0);
    }
  }

  async loadCurrentQueues() {
    // Load current queue data for each hospital
    return new Promise((resolve) => {
      db.all(`
        SELECT hospital_id, COUNT(*) as queue_size
        FROM queue_management
        WHERE status != 'completed'
        GROUP BY hospital_id
      `, (err, rows) => {
        if (!err && rows) {
          rows.forEach(row => {
            this.hospitalCapacities.set(row.hospital_id, row.queue_size);
          });
        }
        resolve();
      });
    });
  }

  async getHospitalQueueLoad(hospitalId) {
    return this.hospitalCapacities.get(hospitalId) || 0;
  }

  async recalculateQueuePositions(hospitalId) {
    // Recalculate queue positions based on criticality and arrival time
    return new Promise((resolve) => {
      db.all(`
        SELECT * FROM queue_management qm
        JOIN patient_reports pr ON qm.report_id = pr.report_id
        WHERE qm.hospital_id = ? AND qm.status != 'completed'
        ORDER BY 
          CASE qm.criticality
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Moderate' THEN 3
            WHEN 'Low' THEN 4
            ELSE 5
          END,
          qm.created_at ASC
      `, [hospitalId], (err, rows) => {
        if (!err && rows) {
          rows.forEach((row, index) => {
            db.run(`
              UPDATE queue_management 
              SET queue_position = ? 
              WHERE report_id = ?
            `, [index + 1, row.report_id]);
          });
        }
        resolve();
      });
    });
  }
}

// Auto-run functionality
async function runAIQueueManager() {
  const aiManager = new AIQueueManager();
  
  try {
    await aiManager.initialize();
    
    // Process patients immediately
    await aiManager.processNewPatients();
    
    // Set up periodic processing (every 2 minutes)
    setInterval(async () => {
      console.log('\n🔄 AI Queue Manager: Periodic scan...');
      await aiManager.processNewPatients();
    }, 120000); // 2 minutes
    
    console.log('\n🤖 AI Queue Manager is now running continuously...');
    console.log('   📋 Scanning for new patients every 2 minutes');
    console.log('   🎯 Auto-analyzing and queuing patients');
    console.log('   🏥 Optimizing hospital assignments');
    console.log('\nPress Ctrl+C to stop');
    
  } catch (error) {
    console.error('❌ AI Queue Manager failed to start:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { AIQueueManager };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAIQueueManager();
}