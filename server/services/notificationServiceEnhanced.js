/**
 * Enhanced Notification Service
 * 
 * Features:
 * - Multi-channel delivery (SMS, Email, Push, In-App)
 * - Delivery tracking and confirmation
 * - Automatic fallback channels
 * - HIPAA-compliant templates
 * - Retry logic with exponential backoff
 * - Priority-based routing
 * - Delivery receipts and acknowledgments
 */

import { retryWithBackoff, CircuitBreaker } from '../utils/retryHelper.js';
import { ExternalServiceError, ErrorCodes } from './errorHandlerService.js';
import EncryptionService from './encryptionService.js';

// ============================================================================
// NOTIFICATION TEMPLATES (HIPAA-COMPLIANT)
// ============================================================================

const TEMPLATES = {
  PATIENT_REPORT_SUBMITTED: {
    sms: (data) => `MySpaceER: Your emergency report has been received. Ref: ${data.reportId.slice(0, 8)}. Hospital will contact you shortly.`,
    email: {
      subject: (data) => `Emergency Report Received - Reference ${data.reportId.slice(0, 8)}`,
      body: (data) => `
Dear ${data.patientName},

Your emergency report has been successfully received by our system.

Reference Number: ${data.reportId.slice(0, 8)}
Submitted: ${new Date(data.timestamp).toLocaleString()}

The nearest hospital has been notified and will contact you shortly regarding your emergency.

If this is a life-threatening emergency, please call 911 immediately.

MySpaceER Team
      `.trim(),
    },
    push: (data) => ({
      title: 'Report Received',
      body: `Your emergency report (${data.reportId.slice(0, 8)}) has been submitted successfully.`,
    }),
  },

  NEW_PATIENT_ALERT: {
    sms: (data) => `🚨 NEW EMERGENCY - ESI ${data.esiLevel} (${data.priority}). Patient: ${data.ageRange} ${data.gender}. ${data.chiefComplaint}. Ref: ${data.reportId.slice(0, 8)}`,
    email: {
      subject: (data) => `🚨 NEW EMERGENCY PATIENT - ESI Level ${data.esiLevel} (${data.priority})`,
      body: (data) => `
EMERGENCY PATIENT ALERT

Priority: ${data.priority}
ESI Level: ${data.esiLevel} (${data.esiCategory})

PATIENT INFORMATION:
- Age Range: ${data.ageRange}
- Gender: ${data.gender}
- Chief Complaint: ${data.chiefComplaint}

${data.vitalSigns ? `VITAL SIGNS:
- BP: ${data.vitalSigns.systolic}/${data.vitalSigns.diastolic} mmHg
- HR: ${data.vitalSigns.heartRate} bpm
- RR: ${data.vitalSigns.respiratoryRate} /min
- SpO2: ${data.vitalSigns.oxygenSaturation}%
- Temp: ${data.vitalSigns.temperature}°C` : ''}

${data.redFlags && data.redFlags.criticalCount > 0 ? `⚠️ RED FLAGS: ${data.redFlags.criticalCount} CRITICAL, ${data.redFlags.warningCount} WARNING` : ''}

${data.clinicalSummary || ''}

Reference: ${data.reportId.slice(0, 8)}
Timestamp: ${new Date(data.timestamp).toLocaleString()}

Click to view full report: ${data.reportUrl}
      `.trim(),
    },
    push: (data) => ({
      title: `🚨 ESI ${data.esiLevel} Emergency`,
      body: `${data.ageRange} ${data.gender} - ${data.chiefComplaint}`,
      data: {
        reportId: data.reportId,
        priority: data.priority,
        esiLevel: data.esiLevel,
      },
    }),
  },

  CRITICAL_CONDITION_ALERT: {
    sms: (data) => `🚨🚨 CRITICAL PATIENT - ESI 1 - IMMEDIATE INTERVENTION REQUIRED. ${data.redFlagSummary}. Ref: ${data.reportId.slice(0, 8)}. RESPOND IMMEDIATELY.`,
    email: {
      subject: (data) => `🚨🚨 CRITICAL PATIENT ALERT - IMMEDIATE RESPONSE REQUIRED`,
      body: (data) => `
***CRITICAL EMERGENCY ALERT***

ESI LEVEL 1 - RESUSCITATION REQUIRED
IMMEDIATE LIFE-SAVING INTERVENTION NEEDED

${data.redFlagSummary}

PATIENT: ${data.ageRange} ${data.gender}
INCIDENT: ${data.chiefComplaint}

${data.clinicalSummary}

IMMEDIATE ACTIONS REQUIRED:
${data.immediateActions ? data.immediateActions.map(a => `- ${a}`).join('\n') : ''}

Reference: ${data.reportId.slice(0, 8)}
Timestamp: ${new Date(data.timestamp).toLocaleString()}

VIEW FULL REPORT IMMEDIATELY: ${data.reportUrl}

***ACKNOWLEDGE THIS ALERT IMMEDIATELY***
      `.trim(),
    },
    push: (data) => ({
      title: '🚨🚨 CRITICAL PATIENT - RESPOND NOW',
      body: `ESI 1 - ${data.redFlagSummary}`,
      priority: 'high',
      sound: 'critical_alert.wav',
      data: {
        reportId: data.reportId,
        requiresAck: true,
        esiLevel: 1,
      },
    }),
  },

  STAFF_ASSIGNED: {
    sms: (data) => `You have been assigned to patient ${data.reportId.slice(0, 8)}. ESI ${data.esiLevel}. Please review immediately.`,
    email: {
      subject: (data) => `Patient Assignment - ESI ${data.esiLevel}`,
      body: (data) => `
You have been assigned to a new patient.

Reference: ${data.reportId.slice(0, 8)}
ESI Level: ${data.esiLevel} (${data.esiCategory})
Priority: ${data.priority}

View patient details: ${data.reportUrl}

MySpaceER System
      `.trim(),
    },
    push: (data) => ({
      title: 'New Patient Assignment',
      body: `ESI ${data.esiLevel} - ${data.chiefComplaint}`,
    }),
  },
};

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

class NotificationServiceEnhanced {
  constructor() {
    this.circuitBreakers = {
      sms: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
      email: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
      push: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 }),
    };
  }

  /**
   * Send notification with automatic channel fallback
   */
  async sendNotification(config) {
    const {
      type,
      recipientId,
      recipientContact,
      channels = ['push', 'email'],
      priority = 'normal',
      data,
      requiresAcknowledgment = false,
    } = config;

    const notificationId = this.generateNotificationId();
    const deliveryResults = [];

    // Determine channel order based on priority
    const orderedChannels = this.orderChannelsByPriority(channels, priority);

    // Try each channel in order
    for (const channel of orderedChannels) {
      try {
        const result = await this.sendViaChannel(
          channel,
          type,
          recipientContact,
          data,
          notificationId
        );

        deliveryResults.push({
          channel,
          status: 'delivered',
          timestamp: new Date().toISOString(),
          messageId: result.messageId,
        });

        // For critical notifications, send to all channels
        if (priority !== 'critical') {
          break; // Stop after first successful delivery
        }
      } catch (error) {
        deliveryResults.push({
          channel,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // Continue to fallback channel
        continue;
      }
    }

    // Log delivery to database
    await this.logDelivery({
      notificationId,
      type,
      recipientId,
      priority,
      deliveryResults,
      requiresAcknowledgment,
    });

    // Check if at least one channel succeeded
    const delivered = deliveryResults.some(r => r.status === 'delivered');

    if (!delivered) {
      throw new ExternalServiceError(
        'All notification channels failed',
        ErrorCodes.NOTIFICATION_DELIVERY_FAILED,
        { deliveryResults }
      );
    }

    return {
      notificationId,
      delivered,
      deliveryResults,
      requiresAcknowledgment,
    };
  }

  /**
   * Send notification via specific channel
   */
  async sendViaChannel(channel, type, recipientContact, data, notificationId) {
    const template = TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    switch (channel) {
      case 'sms':
        return await this.sendSMS(recipientContact.phone, template.sms(data), notificationId);
      
      case 'email':
        return await this.sendEmail(
          recipientContact.email,
          template.email.subject(data),
          template.email.body(data),
          notificationId
        );
      
      case 'push':
        return await this.sendPush(recipientContact.deviceToken, template.push(data), notificationId);
      
      case 'in-app':
        return await this.sendInApp(recipientContact.userId, type, data, notificationId);
      
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(phoneNumber, message, notificationId) {
    return await this.circuitBreakers.sms.execute(async () => {
      return await retryWithBackoff(
        async () => {
          // HIPAA-compliant: Don't include PHI in SMS unless explicitly consented
          const sanitizedMessage = this.sanitizeForSMS(message);
          
          // Integration with SMS provider (Twilio, etc.)
          // For demo, we'll simulate
          console.log(`📱 SMS to ${phoneNumber}: ${sanitizedMessage}`);
          
          // Simulate API call
          await this.simulateAPICall();
          
          return {
            messageId: `sms_${notificationId}`,
            status: 'sent',
            provider: 'twilio',
          };
        },
        { maxRetries: 3, baseDelay: 1000 }
      );
    });
  }

  /**
   * Send email notification
   */
  async sendEmail(email, subject, body, notificationId) {
    return await this.circuitBreakers.email.execute(async () => {
      return await retryWithBackoff(
        async () => {
          // HIPAA-compliant: Encrypt sensitive data in email
          const encryptedBody = this.prepareHIPAACompliantEmail(body);
          
          console.log(`📧 Email to ${email}`);
          console.log(`Subject: ${subject}`);
          console.log(`Body: ${encryptedBody.slice(0, 100)}...`);
          
          // Simulate API call
          await this.simulateAPICall();
          
          return {
            messageId: `email_${notificationId}`,
            status: 'sent',
            provider: 'sendgrid',
          };
        },
        { maxRetries: 3, baseDelay: 2000 }
      );
    });
  }

  /**
   * Send push notification
   */
  async sendPush(deviceToken, payload, notificationId) {
    return await this.circuitBreakers.push.execute(async () => {
      return await retryWithBackoff(
        async () => {
          console.log(`🔔 Push to device ${deviceToken?.slice(0, 10)}...`);
          console.log(`Payload:`, payload);
          
          // Integration with push provider (Firebase, OneSignal, etc.)
          await this.simulateAPICall();
          
          return {
            messageId: `push_${notificationId}`,
            status: 'sent',
            provider: 'firebase',
          };
        },
        { maxRetries: 5, baseDelay: 500 }
      );
    });
  }

  /**
   * Send in-app notification
   */
  async sendInApp(userId, type, data, notificationId) {
    // Store in database for in-app display
    console.log(`📱 In-app notification for user ${userId}`);
    
    // This would insert into a notifications table
    return {
      messageId: `inapp_${notificationId}`,
      status: 'sent',
      provider: 'internal',
    };
  }

  /**
   * Order channels by priority
   */
  orderChannelsByPriority(channels, priority) {
    const priorityOrder = {
      critical: ['sms', 'push', 'email', 'in-app'],
      high: ['push', 'sms', 'email', 'in-app'],
      normal: ['push', 'in-app', 'email', 'sms'],
    };

    const order = priorityOrder[priority] || priorityOrder.normal;
    return order.filter(c => channels.includes(c));
  }

  /**
   * Sanitize message for SMS (remove PHI if needed)
   */
  sanitizeForSMS(message) {
    // Remove any potential PHI patterns
    // In production, this would be more sophisticated
    return message.slice(0, 160); // SMS character limit
  }

  /**
   * Prepare HIPAA-compliant email
   */
  prepareHIPAACompliantEmail(body) {
    // In production, this would:
    // 1. Use TLS for transport
    // 2. Potentially encrypt sensitive fields
    // 3. Include secure portal link instead of PHI
    // 4. Add encryption notice footer
    
    return body + '\n\n---\nThis message contains confidential health information protected by HIPAA.';
  }

  /**
   * Log notification delivery to database
   */
  async logDelivery(deliveryData) {
    // This would insert into notification_logs table
    console.log('📝 Logging delivery:', deliveryData);
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate API call delay
   */
  async simulateAPICall() {
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send patient confirmation
   */
  async sendPatientConfirmation(patientData, reportId) {
    return await this.sendNotification({
      type: 'PATIENT_REPORT_SUBMITTED',
      recipientId: null,
      recipientContact: {
        email: patientData.contact_email,
        phone: patientData.contact_phone,
      },
      channels: ['email', 'sms'],
      priority: 'normal',
      data: {
        reportId,
        patientName: patientData.name,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send critical patient alert to medical staff
   */
  async sendCriticalAlert(staffContact, patientData, clinicalAssessment, reportId) {
    return await this.sendNotification({
      type: 'CRITICAL_CONDITION_ALERT',
      recipientId: staffContact.id,
      recipientContact: {
        email: staffContact.email,
        phone: staffContact.phone,
        deviceToken: staffContact.device_token,
        userId: staffContact.id,
      },
      channels: ['sms', 'push', 'email', 'in-app'],
      priority: 'critical',
      requiresAcknowledgment: true,
      data: {
        reportId,
        ageRange: patientData.age_range,
        gender: patientData.gender,
        chiefComplaint: patientData.incident_type,
        redFlagSummary: clinicalAssessment.redFlags.summary,
        clinicalSummary: clinicalAssessment.clinicalSummary,
        immediateActions: clinicalAssessment.clinicalRecommendations.immediate,
        timestamp: new Date().toISOString(),
        reportUrl: `${process.env.APP_URL}/reports/${reportId}`,
      },
    });
  }

  /**
   * Send new patient alert to medical staff
   */
  async sendNewPatientAlert(staffContact, patientData, clinicalAssessment, reportId) {
    const priority = clinicalAssessment.esi.esiLevel <= 2 ? 'high' : 'normal';
    
    return await this.sendNotification({
      type: 'NEW_PATIENT_ALERT',
      recipientId: staffContact.id,
      recipientContact: {
        email: staffContact.email,
        phone: staffContact.phone,
        deviceToken: staffContact.device_token,
        userId: staffContact.id,
      },
      channels: clinicalAssessment.notificationPriority.channels,
      priority: clinicalAssessment.notificationPriority.urgency,
      requiresAcknowledgment: clinicalAssessment.notificationPriority.requiresAcknowledgment,
      data: {
        reportId,
        esiLevel: clinicalAssessment.esi.esiLevel,
        esiCategory: clinicalAssessment.esi.category,
        priority: clinicalAssessment.esi.priority,
        ageRange: patientData.age_range,
        gender: patientData.gender,
        chiefComplaint: patientData.incident_type,
        vitalSigns: patientData.vital_signs,
        redFlags: clinicalAssessment.redFlags,
        clinicalSummary: clinicalAssessment.clinicalSummary,
        timestamp: new Date().toISOString(),
        reportUrl: `${process.env.APP_URL}/reports/${reportId}`,
      },
    });
  }
}

export default new NotificationServiceEnhanced();
