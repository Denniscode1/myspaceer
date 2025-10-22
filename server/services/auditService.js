import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../emergency_system.db');
const db = new sqlite3.Database(dbPath);

/**
 * Audit Service - HIPAA-Compliant Immutable Audit Logging
 * Implements blockchain-style hash chains to prevent log tampering
 */
export class AuditService {
  constructor() {
    this.lastHashCache = null;
  }
  
  /**
   * Log an action to the immutable audit trail
   * @param {Object} action - Action to log
   */
  async logAction(action) {
    try {
      const previousHash = await this.getLastLogHash();
      
      const logRecord = {
        event_type: action.eventType,
        entity_type: action.entityType,
        entity_id: action.entityId,
        user_id: action.userId || 'system',
        user_role: action.userRole || 'system',
        user_ip: action.ipAddress || null,
        action_performed: action.actionDescription,
        data_before: action.dataBefore ? JSON.stringify(action.dataBefore) : null,
        data_after: action.dataAfter ? JSON.stringify(action.dataAfter) : null,
        timestamp: new Date().toISOString()
      };
      
      // Create hash chain - current record hash includes previous hash
      const recordString = JSON.stringify(logRecord) + (previousHash || '');
      const hash = crypto.createHash('sha256').update(recordString).digest('hex');
      
      // Insert into immutable audit log
      return new Promise((resolve, reject) => {
        const sql = `
          INSERT INTO immutable_audit_log 
          (log_hash, previous_log_hash, event_type, entity_type, entity_id, 
           user_id, user_role, user_ip, action_performed, data_before, data_after, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
          hash,
          previousHash,
          logRecord.event_type,
          logRecord.entity_type,
          logRecord.entity_id,
          logRecord.user_id,
          logRecord.user_role,
          logRecord.user_ip,
          logRecord.action_performed,
          logRecord.data_before,
          logRecord.data_after,
          logRecord.timestamp
        ], function(err) {
          if (err) {
            console.error('Failed to log audit action:', err);
            reject(err);
          } else {
            // Update cache
            this.lastHashCache = hash;
            resolve({ success: true, logId: this.lastID, hash });
          }
        });
      });
    } catch (error) {
      console.error('Audit logging error:', error);
      throw error;
    }
  }
  
  /**
   * Get the hash of the last audit log entry (for chain continuation)
   */
  async getLastLogHash() {
    if (this.lastHashCache) {
      return this.lastHashCache;
    }
    
    return new Promise((resolve, reject) => {
      const sql = 'SELECT log_hash FROM immutable_audit_log ORDER BY id DESC LIMIT 1';
      
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          const hash = row ? row.log_hash : null;
          this.lastHashCache = hash;
          resolve(hash);
        }
      });
    });
  }
  
  /**
   * Verify integrity of audit log chain
   * @param {number} startId - Starting log ID (default: 1)
   * @param {number} endId - Ending log ID (default: latest)
   * @returns {Object} Verification result
   */
  async verifyLogIntegrity(startId = 1, endId = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM immutable_audit_log WHERE id >= ? ';
      const params = [startId];
      
      if (endId) {
        sql += 'AND id <= ? ';
        params.push(endId);
      }
      
      sql += 'ORDER BY id ASC';
      
      db.all(sql, params, (err, logs) => {
        if (err) {
          reject(err);
          return;
        }
        
        const verification = {
          totalLogs: logs.length,
          verified: 0,
          failed: 0,
          errors: []
        };
        
        let previousHash = null;
        
        for (const log of logs) {
          // Reconstruct the record that was hashed
          const logRecord = {
            event_type: log.event_type,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            user_id: log.user_id,
            user_role: log.user_role,
            user_ip: log.user_ip,
            action_performed: log.action_performed,
            data_before: log.data_before,
            data_after: log.data_after,
            timestamp: log.timestamp
          };
          
          // Recalculate hash
          const recordString = JSON.stringify(logRecord) + (previousHash || '');
          const calculatedHash = crypto.createHash('sha256').update(recordString).digest('hex');
          
          // Verify hash matches
          if (calculatedHash === log.log_hash) {
            verification.verified++;
          } else {
            verification.failed++;
            verification.errors.push({
              logId: log.id,
              expectedHash: log.log_hash,
              calculatedHash,
              message: 'Hash mismatch - log may have been tampered with'
            });
          }
          
          // Verify chain linkage
          if (log.previous_log_hash !== previousHash) {
            verification.failed++;
            verification.errors.push({
              logId: log.id,
              message: 'Chain broken - previous hash mismatch',
              expected: previousHash,
              actual: log.previous_log_hash
            });
          }
          
          previousHash = log.log_hash;
        }
        
        verification.isValid = verification.failed === 0;
        resolve(verification);
      });
    });
  }
  
  /**
   * Generate HIPAA-compliant audit report
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @param {string} entityType - Optional: filter by entity type
   */
  async generateComplianceReport(startDate, endDate, entityType = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM immutable_audit_log 
        WHERE timestamp >= ? AND timestamp <= ?
      `;
      const params = [startDate, endDate];
      
      if (entityType) {
        sql += ' AND entity_type = ?';
        params.push(entityType);
      }
      
      sql += ' ORDER BY timestamp DESC';
      
      db.all(sql, params, (err, logs) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Analyze logs
        const report = {
          reportGenerated: new Date().toISOString(),
          period: { startDate, endDate },
          entityType: entityType || 'all',
          totalActions: logs.length,
          actionsByType: {},
          actionsByUser: {},
          actionsByEntity: {},
          securityEvents: [],
          modifiedRecords: [],
          deletedRecords: [],
          accessedBy: new Set()
        };
        
        logs.forEach(log => {
          // Count by action type
          report.actionsByType[log.event_type] = (report.actionsByType[log.event_type] || 0) + 1;
          
          // Count by user
          report.actionsByUser[log.user_id] = (report.actionsByUser[log.user_id] || 0) + 1;
          
          // Count by entity
          report.actionsByEntity[log.entity_type] = (report.actionsByEntity[log.entity_type] || 0) + 1;
          
          // Track who accessed data
          report.accessedBy.add(log.user_id);
          
          // Track modifications
          if (log.event_type.includes('update') || log.event_type.includes('modify')) {
            report.modifiedRecords.push({
              entityId: log.entity_id,
              modifiedBy: log.user_id,
              modifiedAt: log.timestamp,
              changes: {
                before: log.data_before ? JSON.parse(log.data_before) : null,
                after: log.data_after ? JSON.parse(log.data_after) : null
              }
            });
          }
          
          // Track deletions
          if (log.event_type.includes('delete')) {
            report.deletedRecords.push({
              entityId: log.entity_id,
              deletedBy: log.user_id,
              deletedAt: log.timestamp,
              data: log.data_before ? JSON.parse(log.data_before) : null
            });
          }
          
          // Flag security-sensitive events
          const securityEventTypes = [
            'login_failed',
            'unauthorized_access',
            'permission_denied',
            'mfa_failed',
            'suspicious_activity'
          ];
          
          if (securityEventTypes.some(type => log.event_type.includes(type))) {
            report.securityEvents.push({
              eventType: log.event_type,
              userId: log.user_id,
              timestamp: log.timestamp,
              details: log.action_performed
            });
          }
        });
        
        // Convert Set to Array for JSON serialization
        report.accessedBy = Array.from(report.accessedBy);
        
        resolve(report);
      });
    });
  }
  
  /**
   * Log data access (for HIPAA compliance)
   * @param {Object} accessInfo - Data access information
   */
  async logDataAccess(accessInfo) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO data_access_log 
        (user_id, user_role, patient_report_id, access_type, fields_accessed, ip_address, user_agent, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        accessInfo.userId,
        accessInfo.userRole,
        accessInfo.patientReportId,
        accessInfo.accessType,
        accessInfo.fieldsAccessed ? JSON.stringify(accessInfo.fieldsAccessed) : null,
        accessInfo.ipAddress || null,
        accessInfo.userAgent || null,
        new Date().toISOString()
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, logId: this.lastID });
        }
      });
    });
  }
  
  /**
   * Get data access history for a patient report
   * @param {string} reportId - Patient report ID
   */
  async getDataAccessHistory(reportId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM data_access_log 
        WHERE patient_report_id = ? 
        ORDER BY timestamp DESC
      `;
      
      db.all(sql, [reportId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  /**
   * Get all data access by a specific user
   * @param {string} userId - User ID
   */
  async getUserAccessHistory(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM data_access_log 
        WHERE user_id = ? 
        ORDER BY timestamp DESC
        LIMIT 1000
      `;
      
      db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Singleton instance
export const auditService = new AuditService();

// Export utility functions
export const logAuditAction = (action) => auditService.logAction(action);
export const logDataAccess = (accessInfo) => auditService.logDataAccess(accessInfo);
export const verifyAuditIntegrity = (startId, endId) => auditService.verifyLogIntegrity(startId, endId);
export const generateComplianceReport = (startDate, endDate, entityType) => 
  auditService.generateComplianceReport(startDate, endDate, entityType);
export const getDataAccessHistory = (reportId) => auditService.getDataAccessHistory(reportId);
export const getUserAccessHistory = (userId) => auditService.getUserAccessHistory(userId);
