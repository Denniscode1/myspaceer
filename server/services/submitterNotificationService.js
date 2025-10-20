import { queueNotification, notificationService } from './notificationService.js';
import { getPatientReports, logEvent, db } from '../database-enhanced.js';

/**
 * Submitter Notification Service
 * Handles notifications to whoever submitted the patient report (EMT, family member, etc.)
 * This allows anyone who brings a patient to the hospital to receive status updates
 */
export class SubmitterNotificationService {
  constructor() {
    this.templates = {
      submitter_queue_update: {
        subject: '🏥 Patient Queue Update - Report {report_id}',
        sms: 'Hospital Update: Patient {patient_name} is #{position} in queue at {hospital}. Status: {status}. Est. wait: {wait_time}min. Report: {report_id}',
        email: `
Dear {submitter_name},

Thank you for bringing {patient_name} to our emergency system. Here's the latest update:

📋 Report ID: {report_id}
👤 Patient: {patient_name}
🏥 Hospital: {hospital}
📍 Queue Position: #{position}
⚠️ Criticality Level: {criticality}
📱 Current Status: {status}
⏱️ Estimated Wait Time: {wait_time} minutes

The patient has been triaged and assigned to the appropriate medical facility. We'll keep you updated on their progress.

If you need to contact the hospital directly or have urgent concerns, please call the hospital's emergency department.

Thank you for using MySpaceER Emergency System.

Emergency Response Team
        `
      },
      submitter_status_update: {
        subject: '📱 Patient Status Update - Report {report_id}',
        sms: 'Status Update: Patient {patient_name} (Report {report_id}) is now "{status}". Hospital: {hospital}. Assigned Doctor: {assigned_doctor}',
        email: `
Dear {submitter_name},

We wanted to update you on {patient_name}'s emergency report status:

📋 Report ID: {report_id}
👤 Patient: {patient_name}
📱 New Status: {status}
⚠️ Criticality: {criticality}
🏥 Hospital: {hospital}
👨‍⚕️ Assigned Doctor: {assigned_doctor}

{status_description}

We'll continue to monitor {patient_name}'s progress and send you updates as their treatment advances.

If you have any questions, please contact the hospital directly.

Take care,
Emergency Medical System
        `
      },
      submitter_treatment_ready: {
        subject: '🚨 Patient Ready for Treatment - Report {report_id}',
        sms: 'URGENT: Patient {patient_name} is now ready for treatment at {hospital}. Dr. {doctor_name} is waiting. Report: {report_id}',
        email: `
Dear {submitter_name},

🚨 URGENT UPDATE: {patient_name} is now ready for immediate treatment.

📋 Report ID: {report_id}
👤 Patient: {patient_name}
🏥 Hospital: {hospital}
👨‍⚕️ Doctor: Dr. {doctor_name}
⚠️ Criticality: {criticality}

{patient_name} has reached the front of the queue and Dr. {doctor_name} is ready to begin treatment immediately.

If you're with the patient, please ensure they proceed to the treatment area. If you're not present, the hospital staff will handle their care.

Emergency Response Team
        `
      },
      submitter_treatment_started: {
        subject: '🏥 Patient Treatment Started - Report {report_id}',
        sms: 'Treatment Update: {patient_name} has begun treatment with Dr. {doctor_name} at {hospital}. You will receive updates as treatment progresses. Report: {report_id}',
        email: `
Dear {submitter_name},

🏥 {patient_name}'s treatment has officially started.

📋 Report ID: {report_id}
👤 Patient: {patient_name}
👨‍⚕️ Attending Doctor: Dr. {doctor_name}
🏥 Hospital: {hospital}
⚠️ Criticality: {criticality}
🕐 Treatment Started: {treatment_start_time}

{patient_name} is now receiving active medical care from our emergency team. Dr. {doctor_name} and the medical staff are providing appropriate treatment for their condition.

We will notify you when treatment is completed or if there are any significant updates.

Hospital Medical Team
        `
      },
      submitter_treatment_completed: {
        subject: '✅ Patient Treatment Completed - Report {report_id}',
        sms: 'Treatment Complete: {patient_name} has completed emergency treatment at {hospital}. Status: {discharge_status}. Report: {report_id}',
        email: `
Dear {submitter_name},

✅ {patient_name}'s emergency treatment has been completed successfully.

📋 Report ID: {report_id}
👤 Patient: {patient_name}
👨‍⚕️ Treating Doctor: Dr. {doctor_name}
🏥 Hospital: {hospital}
⚠️ Original Criticality: {criticality}
📋 Discharge Status: {discharge_status}
🕐 Treatment Completed: {completion_time}

{treatment_summary}

📄 DISCHARGE INFORMATION:
{discharge_instructions}

{follow_up_message}

Thank you for bringing {patient_name} to our emergency services. We hope they have a swift recovery.

Hospital Emergency Team
        `
      }
    };
  }

  /**
   * Get submitter contact information from patient report
   */
  async getSubmitterContact(reportId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          submitter_phone, submitter_email, submitter_name,
          contact_email, contact_phone, name as patient_name
         FROM patient_reports 
         WHERE report_id = ?`,
        [reportId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            // Prioritize submitter contact info, fallback to patient contact info
            const contact = {
              phone: row.submitter_phone || row.contact_phone,
              email: row.submitter_email || row.contact_email,
              name: row.submitter_name || 'Emergency Contact',
              patient_name: row.patient_name || 'Patient'
            };
            resolve(contact);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Send queue position update to submitter
   */
  async notifySubmitterQueueUpdate(reportId, queueData) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        console.log(`Patient report ${reportId} not found`);
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const submitterContact = await this.getSubmitterContact(reportId);

      if (!submitterContact || (!submitterContact.email && !submitterContact.phone)) {
        console.log(`No submitter contact information for report ${reportId}`);
        return { success: false, error: 'No submitter contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: submitterContact.patient_name,
        submitter_name: submitterContact.name,
        hospital: queueData.hospital_name || 'Hospital',
        position: queueData.queue_position || 'TBD',
        criticality: report.criticality || 'Being assessed',
        status: this.formatReportStatus(report.status),
        wait_time: queueData.estimated_wait_time ? Math.round(queueData.estimated_wait_time / 60) : 'Unknown'
      };

      const notifications = [];

      // Send email notification
      if (submitterContact.email) {
        const emailMessage = this.fillTemplate(this.templates.submitter_queue_update.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.submitter_queue_update.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', submitterContact.email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (submitterContact.phone) {
        const smsMessage = this.fillTemplate(this.templates.submitter_queue_update.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', submitterContact.phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('submitter_notified', 'submitter_notification', reportId, null, null, {
        notification_type: 'queue_update',
        channels_sent: successful,
        total_channels: notifications.length,
        submitter_name: submitterContact.name
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send submitter queue update notification:', error);
      throw error;
    }
  }

  /**
   * Send status update notification to submitter
   */
  async notifySubmitterStatusUpdate(reportId, newStatus, assignedDoctor = null) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const submitterContact = await this.getSubmitterContact(reportId);

      if (!submitterContact || (!submitterContact.email && !submitterContact.phone)) {
        return { success: false, error: 'No submitter contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: submitterContact.patient_name,
        submitter_name: submitterContact.name,
        status: this.formatReportStatus(newStatus),
        status_description: this.getStatusDescription(newStatus),
        criticality: report.criticality || 'Being assessed',
        hospital: report.hospital_name || 'Hospital',
        assigned_doctor: assignedDoctor || 'To be assigned'
      };

      const notifications = [];

      // Send email notification
      if (submitterContact.email) {
        const emailMessage = this.fillTemplate(this.templates.submitter_status_update.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.submitter_status_update.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', submitterContact.email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (submitterContact.phone) {
        const smsMessage = this.fillTemplate(this.templates.submitter_status_update.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', submitterContact.phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('submitter_notified', 'submitter_notification', reportId, null, null, {
        notification_type: 'status_update',
        new_status: newStatus,
        channels_sent: successful,
        submitter_name: submitterContact.name
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send submitter status update notification:', error);
      throw error;
    }
  }

  /**
   * Send treatment ready notification to submitter
   */
  async notifySubmitterTreatmentReady(reportId, doctorName) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const submitterContact = await this.getSubmitterContact(reportId);

      if (!submitterContact || (!submitterContact.email && !submitterContact.phone)) {
        return { success: false, error: 'No submitter contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: submitterContact.patient_name,
        submitter_name: submitterContact.name,
        doctor_name: doctorName,
        hospital: report.hospital_name || 'Hospital',
        criticality: report.criticality || 'Being assessed'
      };

      const notifications = [];

      // Send email notification
      if (submitterContact.email) {
        const emailMessage = this.fillTemplate(this.templates.submitter_treatment_ready.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.submitter_treatment_ready.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', submitterContact.email, emailMessage, 'urgent')
        );
      }

      // Send SMS notification
      if (submitterContact.phone) {
        const smsMessage = this.fillTemplate(this.templates.submitter_treatment_ready.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', submitterContact.phone, smsMessage, 'urgent')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('submitter_notified', 'submitter_notification', reportId, null, null, {
        notification_type: 'treatment_ready',
        doctor_name: doctorName,
        channels_sent: successful,
        priority: 'urgent',
        submitter_name: submitterContact.name
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send submitter treatment ready notification:', error);
      throw error;
    }
  }

  /**
   * Fill template with data
   */
  fillTemplate(template, data) {
    let filled = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      filled = filled.replace(regex, data[key]);
    });
    return filled;
  }

  /**
   * Format report status for display
   */
  formatReportStatus(status) {
    const statusMap = {
      'Created': 'Report Received',
      'Processing': 'Being Processed',
      'TriageComplete': 'Triage Assessment Complete',
      'Assigned': 'Hospital Assignment Complete',
      'Arrived': 'Patient Arrived at Hospital',
      'InTreatment': 'Currently Receiving Treatment',
      'Completed': 'Treatment Completed',
      'ProcessingError': 'Processing Error - Please Contact Emergency Services'
    };
    return statusMap[status] || status;
  }

  /**
   * Get detailed status description
   */
  getStatusDescription(status) {
    const descriptions = {
      'Created': 'The patient report has been received and is being reviewed by our triage team.',
      'Processing': 'Medical staff are currently processing the emergency report and determining the best course of action.',
      'TriageComplete': 'The patient\'s case has been assessed and prioritized. Hospital assignment is in progress.',
      'Assigned': 'The patient has been assigned to a hospital. Please prepare for travel when contacted.',
      'Arrived': 'The patient has arrived at the hospital and checked in at the emergency reception.',
      'InTreatment': 'The patient is currently receiving medical care from our emergency team.',
      'Completed': 'The patient\'s emergency treatment has been completed. Follow any discharge instructions provided.',
      'ProcessingError': 'There was an issue processing the report. Please contact emergency services immediately.'
    };
    return descriptions[status] || 'Status updated.';
  }
}

// Create singleton instance
export const submitterNotificationService = new SubmitterNotificationService();

// Export utility functions
export const notifySubmitterQueueUpdate = (reportId, queueData) =>
  submitterNotificationService.notifySubmitterQueueUpdate(reportId, queueData);

export const notifySubmitterStatusUpdate = (reportId, newStatus, assignedDoctor) =>
  submitterNotificationService.notifySubmitterStatusUpdate(reportId, newStatus, assignedDoctor);

export const notifySubmitterTreatmentReady = (reportId, doctorName) =>
  submitterNotificationService.notifySubmitterTreatmentReady(reportId, doctorName);