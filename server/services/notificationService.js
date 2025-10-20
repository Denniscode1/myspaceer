import { db, logEvent } from '../database-enhanced.js';
import dotenv from 'dotenv';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

/**
 * Notification Service
 * Handles SMS, push notifications, and alerts for queue updates and patient communication
 */
export class NotificationService {
  constructor() {
    this.providers = {
      sms: process.env.SMS_PROVIDER || 'console', // 'twilio', 'console', 'disabled'
      push: process.env.PUSH_PROVIDER || 'console', // 'firebase', 'console', 'disabled'
      email: process.env.EMAIL_PROVIDER || 'console' // 'smtp', 'console', 'disabled'
    };
    
    this.testMode = process.env.TEST_MODE === 'true';
    this.enableConsoleLogging = process.env.ENABLE_CONSOLE_LOGGING === 'true';
    
    // Initialize Twilio client
    this.twilioClient = null;
    if (this.providers.sms === 'twilio') {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    
    // Initialize email transporter
    this.emailTransporter = null;
    if (this.providers.email === 'smtp') {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
    
    this.templates = {
      queue_position: "You are now #{position} in queue at {hospital}. Estimated wait: {wait_time} minutes. Report ID: {report_id}",
      treatment_ready: "Please proceed to {hospital} - you're next for treatment. Report ID: {report_id}",
      status_update: "Your emergency report status updated to: {status}. Report ID: {report_id}",
      arrival_reminder: "You're arriving at {hospital}. Please check in at emergency reception. Report ID: {report_id}"
    };
    
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      exponentialBackoff: true
    };

    this.initialize();
  }

  async initialize() {
    console.log('Initializing Notification Service...');
    console.log(`SMS Provider: ${this.providers.sms}`);
    console.log(`Email Provider: ${this.providers.email}`);
    console.log(`Push Provider: ${this.providers.push}`);
    console.log(`Test Mode: ${this.testMode}`);
    
    // Validate Twilio configuration
    if (this.providers.sms === 'twilio') {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('⚠️  Twilio SMS: Missing configuration. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file');
      } else {
        console.log('✅ Twilio SMS configured successfully');
      }
    }
    
    // Validate SMTP configuration
    if (this.providers.email === 'smtp') {
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  SMTP Email: Missing configuration. Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
      } else {
        console.log('✅ SMTP Email configured successfully');
        
        // Test email connection
        try {
          await this.emailTransporter.verify();
          console.log('✅ Email server connection verified');
        } catch (error) {
          console.warn('⚠️  Email server connection failed:', error.message);
        }
      }
    }
    
    // Set up periodic processing of pending notifications
    setInterval(() => {
      this.processPendingNotifications().catch(err => {
        console.error('Failed to process pending notifications:', err);
      });
    }, 30000); // Process every 30 seconds
  }

  /**
   * Add notification to queue
   */
  async queueNotification(reportId, type, recipient, message, priority = 'normal') {
    try {
      const sql = `
        INSERT INTO notification_queue (
          report_id, notification_type, recipient, message, 
          status, attempts, max_attempts, created_at
        ) VALUES (?, ?, ?, ?, 'pending', 0, ?, CURRENT_TIMESTAMP)
      `;

      const maxAttempts = priority === 'urgent' ? 5 : this.retryConfig.maxRetries;

      const notificationId = await new Promise((resolve, reject) => {
        db.run(sql, [reportId, type, recipient, message, maxAttempts], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });

      logEvent('notification_queued', 'notification_queue', reportId, null, null, {
        notification_id: notificationId,
        type,
        recipient,
        priority
      });

      // Process immediately if urgent
      if (priority === 'urgent') {
        setImmediate(() => this.processNotification(notificationId));
      }

      return { notification_id: notificationId, status: 'queued' };

    } catch (error) {
      console.error('Failed to queue notification:', error);
      throw error;
    }
  }

  /**
   * Send queue position update notification
   */
  async notifyQueuePosition(reportId, position, hospitalName, waitTimeMinutes, recipient = null) {
    try {
      if (!recipient) {
        recipient = await this.getPatientContact(reportId);
      }

      if (!recipient) {
        console.log(`No contact information for report ${reportId}`);
        return { status: 'no_recipient' };
      }

      const message = this.templates.queue_position
        .replace('#{position}', position)
        .replace('{hospital}', hospitalName)
        .replace('{wait_time}', Math.round(waitTimeMinutes))
        .replace('{report_id}', reportId);

      return await this.queueNotification(reportId, 'queue_position', recipient, message);

    } catch (error) {
      console.error('Failed to notify queue position:', error);
      throw error;
    }
  }

  /**
   * Send "you're next" notification
   */
  async notifyTreatmentReady(reportId, hospitalName, recipient = null) {
    try {
      if (!recipient) {
        recipient = await this.getPatientContact(reportId);
      }

      if (!recipient) {
        console.log(`No contact information for report ${reportId}`);
        return { status: 'no_recipient' };
      }

      const message = this.templates.treatment_ready
        .replace('{hospital}', hospitalName)
        .replace('{report_id}', reportId);

      return await this.queueNotification(reportId, 'treatment_ready', recipient, message, 'urgent');

    } catch (error) {
      console.error('Failed to notify treatment ready:', error);
      throw error;
    }
  }

  /**
   * Send status update notification
   */
  async notifyStatusUpdate(reportId, status, recipient = null) {
    try {
      if (!recipient) {
        recipient = await this.getPatientContact(reportId);
      }

      if (!recipient) {
        return { status: 'no_recipient' };
      }

      const message = this.templates.status_update
        .replace('{status}', this.formatStatus(status))
        .replace('{report_id}', reportId);

      return await this.queueNotification(reportId, 'status_update', recipient, message);

    } catch (error) {
      console.error('Failed to notify status update:', error);
      throw error;
    }
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications() {
    try {
      const sql = `
        SELECT * FROM notification_queue 
        WHERE status = 'pending' AND attempts < max_attempts
        ORDER BY created_at ASC 
        LIMIT 10
      `;

      const notifications = await new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      for (const notification of notifications) {
        await this.processNotification(notification.id);
      }

      if (notifications.length > 0) {
        console.log(`Processed ${notifications.length} pending notifications`);
      }

    } catch (error) {
      console.error('Failed to process pending notifications:', error);
    }
  }

  /**
   * Process individual notification
   */
  async processNotification(notificationId) {
    try {
      // Get notification details
      const notification = await this.getNotificationById(notificationId);
      if (!notification) {
        return;
      }

      // Update attempt count
      await this.incrementAttempts(notificationId);

      // Send notification based on type
      let result;
      if (notification.recipient.includes('@')) {
        // Email address
        result = await this.sendEmail(notification);
      } else {
        // Phone number
        result = await this.sendSMS(notification);
      }

      // Update status based on result
      if (result.success) {
        await this.markNotificationSent(notificationId);
        
        logEvent('notification_sent', 'notification_queue', notification.report_id, null, null, {
          notification_id: notificationId,
          type: notification.notification_type,
          recipient: notification.recipient,
          attempts: notification.attempts + 1
        });
      } else {
        // Check if max attempts reached
        if (notification.attempts >= notification.max_attempts - 1) {
          await this.markNotificationFailed(notificationId, result.error);
          
          logEvent('notification_failed', 'notification_queue', notification.report_id, null, null, {
            notification_id: notificationId,
            error: result.error,
            final_attempt: true
          });
        } else {
          // Will retry later
          logEvent('notification_retry', 'notification_queue', notification.report_id, null, null, {
            notification_id: notificationId,
            error: result.error,
            attempts: notification.attempts + 1
          });
        }
      }

    } catch (error) {
      console.error(`Failed to process notification ${notificationId}:`, error);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification) {
    try {
      // Console logging if enabled
      if (this.enableConsoleLogging) {
        console.log(`📱 SMS to ${notification.recipient}: ${notification.message}`);
      }
      
      // Return early if in test mode
      if (this.testMode) {
        console.log('📱 [TEST MODE] SMS not actually sent');
        return { success: true, note: 'Test mode - SMS not sent' };
      }
      
      switch (this.providers.sms) {
        case 'console':
          console.log(`📱 SMS to ${notification.recipient}: ${notification.message}`);
          return { success: true };
          
        case 'twilio':
          return await this.sendTwilioSMS(notification);
          
        case 'disabled':
          return { success: true, note: 'SMS disabled' };
          
        default:
          return { success: false, error: 'Unknown SMS provider' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification) {
    try {
      switch (this.providers.push) {
        case 'console':
          console.log(`🔔 Push to ${notification.recipient}: ${notification.message}`);
          return { success: true };
          
        case 'firebase':
          return await this.sendFirebasePush(notification);
          
        case 'disabled':
          return { success: true, note: 'Push disabled' };
          
        default:
          return { success: false, error: 'Unknown push provider' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification) {
    try {
      // Console logging if enabled
      if (this.enableConsoleLogging) {
        console.log(`📧 Email to ${notification.recipient}: ${notification.message}`);
      }
      
      // Return early if in test mode
      if (this.testMode) {
        console.log('📧 [TEST MODE] Email not actually sent');
        return { success: true, note: 'Test mode - Email not sent' };
      }
      
      switch (this.providers.email) {
        case 'console':
          console.log(`📧 Email to ${notification.recipient}: ${notification.message}`);
          return { success: true };
          
        case 'smtp':
          return await this.sendSMTPEmail(notification);
          
        case 'disabled':
          return { success: true, note: 'Email disabled' };
          
        default:
          return { success: false, error: 'Unknown email provider' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Twilio SMS implementation (real functionality)
   */
  async sendTwilioSMS(notification) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not initialized. Check your credentials.');
      }
      
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('TWILIO_PHONE_NUMBER not configured in .env file');
      }
      
      const result = await this.twilioClient.messages.create({
        body: notification.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notification.recipient
      });
      
      console.log(`✅ Twilio SMS sent successfully. SID: ${result.sid}`);
      return { 
        success: true, 
        sid: result.sid,
        status: result.status 
      };
      
    } catch (error) {
      console.error('❌ Twilio SMS failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * SMTP Email implementation (real functionality)
   */
  async sendSMTPEmail(notification) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not initialized. Check your SMTP credentials.');
      }
      
      // Create HTML version of the notification for better formatting
      const htmlMessage = notification.message
        .replace(/\n/g, '<br>')
        .replace(/📧/g, '📧')
        .replace(/🏥/g, '🏥')
        .replace(/📱/g, '📱')
        .replace(/⚠️/g, '⚠️')
        .replace(/👨‍⚕️/g, '👨‍⚕️');
      
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'MySpaceER Emergency System',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
        },
        to: notification.recipient,
        subject: this.getEmailSubject(notification.notification_type, notification.report_id),
        text: notification.message,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0; text-align: center;">🏥 MySpaceER Emergency System</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">${htmlMessage}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                This is an automated message from MySpaceER Emergency Triage System.<br>
                For urgent medical emergencies, contact emergency services immediately.
              </p>
            </div>
          </div>
        `
      };
      
      const result = await this.emailTransporter.sendMail(mailOptions);
      
      console.log(`✅ SMTP Email sent successfully. Message ID: ${result.messageId}`);
      return { 
        success: true, 
        messageId: result.messageId,
        response: result.response 
      };
      
    } catch (error) {
      console.error('❌ SMTP Email failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate email subject based on notification type
   */
  getEmailSubject(notificationType, reportId) {
    const subjects = {
      'queue_position': `🏥 Hospital Queue Update - Report ${reportId}`,
      'treatment_ready': `🚨 Ready for Treatment - Report ${reportId}`,
      'status_update': `📱 Medical Status Update - Report ${reportId}`,
      'patient_arrived': `✅ Arrival Confirmed - Report ${reportId}`,
      'treatment_started': `🏥 Treatment Started - Report ${reportId}`,
      'treatment_completed': `✅ Treatment Completed - Report ${reportId}`,
      'medical_staff_credentials': `🔐 MySpaceER Medical Staff Access Granted`
    };
    
    return subjects[notificationType] || `🏥 Emergency Update - Report ${reportId}`;
  }

  /**
   * Firebase push implementation (placeholder)
   */
  async sendFirebasePush(notification) {
    // In production, this would use Firebase Admin SDK
    // const message = {
    //   notification: {
    //     title: 'Emergency Update',
    //     body: notification.message
    //   },
    //   token: notification.recipient
    // };
    // const result = await admin.messaging().send(message);
    
    console.log(`[Firebase Push] ${notification.recipient}: ${notification.message}`);
    return { success: true };
  }

  /**
   * Helper functions for database operations
   */
  async getNotificationById(notificationId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM notification_queue WHERE id = ?', [notificationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async incrementAttempts(notificationId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE notification_queue SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [notificationId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  async markNotificationSent(notificationId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE notification_queue SET status = "sent", sent_at = CURRENT_TIMESTAMP WHERE id = ?',
        [notificationId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  async markNotificationFailed(notificationId, error) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE notification_queue SET status = "failed", error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [error, notificationId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  async getPatientContact(reportId) {
    // Get actual patient contact information from database
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT contact_email, contact_phone FROM patient_reports WHERE report_id = ?',
        [reportId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            // Return actual email or phone - prefer email for notifications
            if (row.contact_email) {
              resolve(row.contact_email);
            } else if (row.contact_phone) {
              resolve(row.contact_phone);
            } else {
              resolve(null); // No contact information available
            }
          } else {
            resolve(null); // Patient not found
          }
        }
      );
    });
  }

  /**
   * Format status for user-friendly display
   */
  formatStatus(status) {
    const statusMap = {
      'Created': 'Report received',
      'Processing': 'Being processed',
      'TriageComplete': 'Triage completed',
      'Assigned': 'Hospital assigned',
      'Arrived': 'Patient arrived',
      'InTreatment': 'Treatment in progress',
      'Completed': 'Treatment completed',
      'ProcessingError': 'Processing error - please contact emergency services'
    };

    return statusMap[status] || status;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(timeframe = '24h') {
    try {
      const hours = timeframe === '24h' ? 24 : (timeframe === '7d' ? 168 : 24);
      
      const sql = `
        SELECT 
          notification_type,
          status,
          COUNT(*) as count,
          AVG(attempts) as avg_attempts
        FROM notification_queue 
        WHERE created_at >= datetime('now', '-${hours} hours')
        GROUP BY notification_type, status
        ORDER BY notification_type, status
      `;

      const stats = await new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      return {
        timeframe,
        statistics: stats,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get notification stats:', error);
      throw error;
    }
  }

  /**
   * Bulk notification for queue updates
   */
  async notifyQueueUpdates(hospitalId) {
    try {
      // Get all patients in queue for this hospital
      const sql = `
        SELECT pq.report_id, pq.queue_position, pq.estimated_wait_time,
               pr.name, h.name as hospital_name
        FROM patient_queue pq
        JOIN patient_reports pr ON pq.report_id = pr.report_id
        JOIN hospitals h ON pq.hospital_id = h.hospital_id
        WHERE pq.hospital_id = ? AND pq.queue_status = 'waiting'
        ORDER BY pq.queue_position ASC
      `;

      const queueItems = await new Promise((resolve, reject) => {
        db.all(sql, [hospitalId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Send notification to each patient
      const notificationPromises = queueItems.map(item => 
        this.notifyQueuePosition(
          item.report_id,
          item.queue_position,
          item.hospital_name,
          item.estimated_wait_time / 60 // Convert to minutes
        )
      );

      const results = await Promise.allSettled(notificationPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      console.log(`Queue update notifications sent: ${successful}/${queueItems.length}`);
      
      return {
        total: queueItems.length,
        successful,
        failed: queueItems.length - successful
      };

    } catch (error) {
      console.error('Failed to send queue update notifications:', error);
      throw error;
    }
  }

  /**
   * Get service configuration and stats
   */
  getServiceInfo() {
    return {
      providers: this.providers,
      retry_config: this.retryConfig,
      templates_available: Object.keys(this.templates),
      service_status: 'active'
    };
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export utility functions
export const queueNotification = (reportId, type, recipient, message, priority) =>
  notificationService.queueNotification(reportId, type, recipient, message, priority);

export const notifyQueuePosition = (reportId, position, hospitalName, waitTimeMinutes, recipient) =>
  notificationService.notifyQueuePosition(reportId, position, hospitalName, waitTimeMinutes, recipient);

export const notifyTreatmentReady = (reportId, hospitalName, recipient) =>
  notificationService.notifyTreatmentReady(reportId, hospitalName, recipient);

export const notifyStatusUpdate = (reportId, status, recipient) =>
  notificationService.notifyStatusUpdate(reportId, status, recipient);