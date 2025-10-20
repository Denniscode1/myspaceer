import { db, logEvent } from '../database-enhanced.js';

/**
 * Advanced Queue Management System
 * Handles priority queues, wait time estimation, and real-time position updates
 */
export class QueueManager {
  constructor() {
    this.queueCache = new Map(); // Hospital ID -> Queue data
    this.averageTreatmentTime = 25 * 60; // 25 minutes in seconds
    this.refreshInterval = 30000; // Refresh cache every 30 seconds
    this.initialize();
  }

  async initialize() {
    console.log('Initializing Queue Manager...');
    await this.refreshQueueCache();
    
    // Set up periodic cache refresh
    setInterval(() => {
      this.refreshQueueCache().catch(err => {
        console.error('Failed to refresh queue cache:', err);
      });
    }, this.refreshInterval);
  }

  /**
   * Add patient to hospital queue with priority scoring
   */
  async addToQueue(reportId, hospitalId, priorityScore, patientData = null) {
    try {
      // Get current queue position
      const position = await this.getNextQueuePosition(hospitalId);
      
      const sql = `
        INSERT INTO patient_queue (
          report_id, hospital_id, queue_position, priority_score, 
          estimated_wait_time, queue_status
        ) VALUES (?, ?, ?, ?, ?, 'waiting')
      `;

      const estimatedWait = await this.calculateWaitTime(hospitalId, position);
      
      return new Promise((resolve, reject) => {
        db.run(sql, [reportId, hospitalId, position, priorityScore, estimatedWait], function(err) {
          if (err) {
            reject(err);
          } else {
            // Log the queue addition
            logEvent('queue_added', 'patient_queue', reportId, null, null, {
              hospital_id: hospitalId,
              position,
              priority_score: priorityScore,
              estimated_wait_time: estimatedWait
            });

            // Trigger queue reordering if needed
            setImmediate(() => this.reorderQueue(hospitalId));

            resolve({
              id: this.lastID,
              position,
              estimated_wait_time: estimatedWait,
              priority_score: priorityScore
            });
          }
        }.bind(this));
      });

    } catch (error) {
      console.error('Failed to add patient to queue:', error);
      throw error;
    }
  }

  /**
   * Get next available queue position for hospital
   */
  async getNextQueuePosition(hospitalId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position FROM patient_queue WHERE hospital_id = ? AND queue_status = "waiting"',
        [hospitalId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.next_position);
          }
        }
      );
    });
  }

  /**
   * Calculate estimated wait time based on queue position and hospital factors
   */
  async calculateWaitTime(hospitalId, position) {
    try {
      // Get hospital data and current queue
      const [hospitalData, queueData] = await Promise.all([
        this.getHospitalData(hospitalId),
        this.getQueueData(hospitalId)
      ]);

      if (!hospitalData) {
        return position * this.averageTreatmentTime;
      }

      // Factors affecting wait time
      const avgTreatmentTime = hospitalData.average_treatment_time * 60; // Convert to seconds
      const currentLoad = queueData.waiting_patients || 0;
      const availableDoctors = await this.getAvailableDoctors(hospitalId);
      
      // Calculate base wait time
      let waitTime = 0;
      
      if (availableDoctors > 0) {
        // Time = (patients ahead / doctors) * treatment time
        const patientsAhead = Math.max(0, position - 1);
        waitTime = Math.ceil(patientsAhead / availableDoctors) * avgTreatmentTime;
        
        // Add current treatment completion time for doctors in session
        const currentTreatmentRemaining = avgTreatmentTime * 0.5; // Assume halfway through
        waitTime += currentTreatmentRemaining;
      } else {
        // No doctors available - use default calculation
        waitTime = position * avgTreatmentTime;
      }

      // Apply load factor (higher load = longer wait)
      const loadFactor = Math.min(2.0, 1 + (currentLoad / hospitalData.capacity));
      waitTime *= loadFactor;

      // Apply time-of-day factor
      const timeOfDayFactor = this.getTimeOfDayFactor();
      waitTime *= timeOfDayFactor;

      return Math.round(waitTime);

    } catch (error) {
      console.error('Wait time calculation failed:', error);
      return position * this.averageTreatmentTime;
    }
  }

  /**
   * Reorder queue based on priority scores (for new high-priority arrivals)
   */
  async reorderQueue(hospitalId) {
    try {
      const sql = `
        SELECT * FROM patient_queue 
        WHERE hospital_id = ? AND queue_status = 'waiting' 
        ORDER BY priority_score DESC, entered_queue_at ASC
      `;

      const queueItems = await new Promise((resolve, reject) => {
        db.all(sql, [hospitalId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Update positions based on priority order
      const updatePromises = queueItems.map((item, index) => {
        const newPosition = index + 1;
        if (item.queue_position !== newPosition) {
          return this.updateQueuePosition(item.id, newPosition, hospitalId);
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      
      // Recalculate wait times
      await this.recalculateWaitTimes(hospitalId);

      logEvent('queue_reordered', 'patient_queue', hospitalId, null, null, {
        hospital_id: hospitalId,
        total_patients: queueItems.length
      });

    } catch (error) {
      console.error('Queue reordering failed:', error);
    }
  }

  /**
   * Update queue position for a specific patient
   */
  async updateQueuePosition(queueId, newPosition, hospitalId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE patient_queue SET queue_position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      db.run(sql, [newPosition, queueId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * Recalculate wait times for all patients in hospital queue
   */
  async recalculateWaitTimes(hospitalId) {
    try {
      const queueItems = await this.getQueueItems(hospitalId);
      
      const updatePromises = queueItems.map(async (item) => {
        const newWaitTime = await this.calculateWaitTime(hospitalId, item.queue_position);
        return this.updateWaitTime(item.id, newWaitTime);
      });

      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error('Wait time recalculation failed:', error);
    }
  }

  /**
   * Update estimated wait time for queue item
   */
  async updateWaitTime(queueId, waitTime) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE patient_queue SET estimated_wait_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      db.run(sql, [waitTime, queueId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * Remove patient from queue (when treatment starts or cancelled)
   * Updated to handle both AI queue management and legacy queue systems
   */
  async removeFromQueue(reportId, reason = 'treatment_started') {
    try {
      let result = { changes: 0 };
      let hospitalId = null;
      
      // First, try to remove from AI queue management table
      const aiQueueSql = `
        UPDATE queue_management 
        SET status = 'removed', updated_at = CURRENT_TIMESTAMP 
        WHERE report_id = ? AND status = 'waiting'
      `;
      
      const aiResult = await new Promise((resolve, reject) => {
        db.run(aiQueueSql, [reportId], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        });
      });
      
      if (aiResult.changes > 0) {
        result = aiResult;
        // Get hospital ID from AI queue management
        const aiQueueItem = await new Promise((resolve, reject) => {
          db.get(
            'SELECT hospital_id FROM queue_management WHERE report_id = ? ORDER BY created_at DESC LIMIT 1',
            [reportId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        hospitalId = aiQueueItem?.hospital_id;
        
        // Reorder AI queue positions
        if (hospitalId) {
          await this.reorderAIQueue(hospitalId);
        }
      } else {
        // Fallback to legacy patient_queue table
        const legacySql = `
          UPDATE patient_queue 
          SET queue_status = 'removed', updated_at = CURRENT_TIMESTAMP 
          WHERE report_id = ? AND queue_status = 'waiting'
        `;

        const legacyResult = await new Promise((resolve, reject) => {
          db.run(legacySql, [reportId], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ changes: this.changes });
            }
          });
        });
        
        if (legacyResult.changes > 0) {
          result = legacyResult;
          // Get hospital ID for reordering
          const queueItem = await this.getQueueItemByReportId(reportId);
          if (queueItem) {
            hospitalId = queueItem.hospital_id;
            // Reorder remaining legacy queue
            await this.reorderQueue(hospitalId);
          }
        }
      }

      if (result.changes > 0) {
        logEvent('queue_removed', 'patient_queue', reportId, null, null, {
          reason,
          hospital_id: hospitalId,
          removed_at: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      console.error('Failed to remove from queue:', error);
      throw error;
    }
  }

  /**
   * Reorder AI queue positions after a patient is removed
   */
  async reorderAIQueue(hospitalId) {
    try {
      const sql = `
        SELECT * FROM queue_management qm
        JOIN patient_reports pr ON qm.report_id = pr.report_id
        WHERE qm.hospital_id = ? AND qm.status = 'waiting'
        ORDER BY 
          CASE qm.criticality
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Moderate' THEN 3
            WHEN 'Low' THEN 4
            ELSE 5
          END,
          qm.created_at ASC
      `;
      
      const queueItems = await new Promise((resolve, reject) => {
        db.all(sql, [hospitalId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      // Update positions based on priority order
      const updatePromises = queueItems.map((item, index) => {
        const newPosition = index + 1;
        if (item.queue_position !== newPosition) {
          return new Promise((resolve, reject) => {
            db.run(`
              UPDATE queue_management 
              SET queue_position = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE report_id = ?
            `, [newPosition, item.report_id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      
      logEvent('ai_queue_reordered', 'queue_management', hospitalId, null, null, {
        hospital_id: hospitalId,
        total_patients: queueItems.length
      });
      
    } catch (error) {
      console.error('AI queue reordering failed:', error);
    }
  }

  /**
   * Get queue item by report ID
   */
  async getQueueItemByReportId(reportId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM patient_queue WHERE report_id = ? ORDER BY created_at DESC LIMIT 1',
        [reportId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  /**
   * Get current queue for hospital (includes both legacy and AI queue management)
   */
  async getHospitalQueue(hospitalId, includeHistory = false) {
    try {
      // First, try to get from AI queue management table
      let aiQueueSql = `
        SELECT qm.*, pr.name, pr.age_range, pr.incident_type, pr.incident_description,
               qm.criticality, pr.patient_status, pr.submitted_at,
               qm.queue_position, qm.estimated_wait_time, qm.ai_confidence,
               qm.created_at as entered_queue_at
        FROM queue_management qm
        JOIN patient_reports pr ON qm.report_id = pr.report_id
        WHERE qm.hospital_id = ?
      `;

      if (!includeHistory) {
        aiQueueSql += " AND qm.status = 'waiting'";
      }

      aiQueueSql += " ORDER BY qm.queue_position ASC";

      const aiQueueItems = await new Promise((resolve, reject) => {
        db.all(aiQueueSql, [hospitalId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      // If AI queue has items, use that
      if (aiQueueItems.length > 0) {
        console.log(`Found ${aiQueueItems.length} patients in AI queue for hospital ${hospitalId}`);
        return {
          hospital_id: hospitalId,
          total_patients: aiQueueItems.length,
          queue_items: aiQueueItems,
          last_updated: new Date().toISOString(),
          source: 'ai_queue_management'
        };
      }

      // Fallback to legacy patient_queue table
      let legacySql = `
        SELECT pq.*, pr.name, pr.age_range, pr.incident_type, pr.incident_description,
               tr.criticality, pr.patient_status, pr.submitted_at,
               pq.queue_position, pq.estimated_wait_time, null as ai_confidence,
               pq.entered_queue_at
        FROM patient_queue pq
        JOIN patient_reports pr ON pq.report_id = pr.report_id
        LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
        WHERE pq.hospital_id = ?
      `;

      if (!includeHistory) {
        legacySql += " AND pq.queue_status = 'waiting'";
      }

      legacySql += " ORDER BY pq.queue_position ASC";

      const legacyQueueItems = await new Promise((resolve, reject) => {
        db.all(legacySql, [hospitalId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      console.log(`Found ${legacyQueueItems.length} patients in legacy queue for hospital ${hospitalId}`);
      
      return {
        hospital_id: hospitalId,
        total_patients: legacyQueueItems.length,
        queue_items: legacyQueueItems,
        last_updated: new Date().toISOString(),
        source: 'legacy_patient_queue'
      };

    } catch (error) {
      console.error('Failed to get hospital queue:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive queue statistics
   */
  async getQueueStatistics(hospitalId = null) {
    try {
      let sql = `
        SELECT 
          pq.hospital_id,
          h.name as hospital_name,
          COUNT(*) as total_patients,
          AVG(pq.estimated_wait_time) as avg_wait_time,
          MIN(pq.estimated_wait_time) as min_wait_time,
          MAX(pq.estimated_wait_time) as max_wait_time,
          AVG(pq.priority_score) as avg_priority_score
        FROM patient_queue pq
        JOIN hospitals h ON pq.hospital_id = h.hospital_id
        WHERE pq.queue_status = 'waiting'
      `;

      const params = [];
      if (hospitalId) {
        sql += ' AND pq.hospital_id = ?';
        params.push(hospitalId);
      }

      sql += ' GROUP BY pq.hospital_id, h.name ORDER BY total_patients DESC';

      const stats = await new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      return {
        queue_statistics: stats,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get queue statistics:', error);
      throw error;
    }
  }

  /**
   * Helper functions
   */
  async getHospitalData(hospitalId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM hospitals WHERE hospital_id = ?', [hospitalId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getQueueData(hospitalId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as waiting_patients FROM patient_queue WHERE hospital_id = ? AND queue_status = "waiting"',
        [hospitalId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { waiting_patients: 0 });
        }
      );
    });
  }

  async getAvailableDoctors(hospitalId) {
    // Simplified - in production, this would check doctor_shifts table
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as available_doctors FROM doctor_shifts WHERE hospital_id = ? AND is_available = 1',
        [hospitalId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.available_doctors : 2); // Default to 2 doctors
        }
      );
    });
  }

  async getQueueItems(hospitalId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM patient_queue WHERE hospital_id = ? AND queue_status = "waiting" ORDER BY queue_position',
        [hospitalId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getTimeOfDayFactor() {
    const hour = new Date().getHours();
    
    // Peak hours have longer wait times
    if (hour >= 8 && hour <= 10) return 1.3; // Morning rush
    if (hour >= 14 && hour <= 16) return 1.2; // Afternoon
    if (hour >= 18 && hour <= 20) return 1.4; // Evening rush
    if (hour >= 22 || hour <= 6) return 0.8; // Night shift - fewer staff
    
    return 1.0; // Normal hours
  }

  /**
   * Refresh in-memory queue cache for performance
   */
  async refreshQueueCache() {
    try {
      const hospitals = await new Promise((resolve, reject) => {
        db.all('SELECT hospital_id FROM hospitals WHERE is_active = 1', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      for (const hospital of hospitals) {
        const queueData = await this.getHospitalQueue(hospital.hospital_id);
        this.queueCache.set(hospital.hospital_id, queueData);
      }

      console.log(`Queue cache refreshed for ${hospitals.length} hospitals`);
      
    } catch (error) {
      console.error('Failed to refresh queue cache:', error);
    }
  }

  /**
   * Get cached queue data (for performance)
   */
  getCachedQueue(hospitalId) {
    return this.queueCache.get(hospitalId);
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      cached_hospitals: this.queueCache.size,
      average_treatment_time_minutes: this.averageTreatmentTime / 60,
      refresh_interval_seconds: this.refreshInterval / 1000,
      last_cache_refresh: new Date().toISOString()
    };
  }
}

// Create singleton instance
export const queueManager = new QueueManager();

// Export utility functions
export const addToQueue = (reportId, hospitalId, priorityScore, patientData) => 
  queueManager.addToQueue(reportId, hospitalId, priorityScore, patientData);

export const removeFromQueue = (reportId, reason) => 
  queueManager.removeFromQueue(reportId, reason);

export const getHospitalQueue = (hospitalId, includeHistory) => 
  queueManager.getHospitalQueue(hospitalId, includeHistory);

export const getQueueStatistics = (hospitalId) => 
  queueManager.getQueueStatistics(hospitalId);