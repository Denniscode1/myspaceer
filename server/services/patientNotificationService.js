import { queueNotification, notificationService } from './notificationService.js';
import { getPatientReports, logEvent } from '../database-enhanced.js';

/**
 * Patient Notification Service
 * Handles notifications to patients about their queue status, triage results, and treatment updates
 */
export class PatientNotificationService {
  constructor() {
    this.templates = {
      queue_update: {
        subject: '🏥 Hospital Queue Update - Report {report_id}',
        sms: 'Hospital Update: You are #{position} in queue at {hospital}. Status: {status}. Criticality: {criticality}. Est. wait: {wait_time}min. Report: {report_id}',
        email: `
Dear {patient_name},

We wanted to update you on your emergency report status:

📋 Report ID: {report_id}
🏥 Hospital: {hospital}
📍 Queue Position: #{position}
⚠️ Criticality Level: {criticality}
👤 Patient Status: {patient_status}
⏱️ Estimated Wait Time: {wait_time} minutes

Your case has been triaged and you've been assigned to the appropriate medical facility. Please ensure you're prepared to travel to the hospital when called.

If you have any urgent concerns or changes in condition, please call emergency services immediately.

Stay safe,
Emergency Triage System
        `
      },
      status_update: {
        subject: '📱 Medical Status Update - Report {report_id}',
        sms: 'Status Update: Your medical report {report_id} is now "{status}". Criticality: {criticality}. Contact hospital if needed.',
        email: `
Dear {patient_name},

Your emergency report status has been updated:

📋 Report ID: {report_id}
📱 New Status: {status}
⚠️ Criticality: {criticality}
🏥 Hospital: {hospital}
👨‍⚕️ Assigned Doctor: {assigned_doctor}

{status_description}

If you have any questions about your care, please contact the hospital directly.

Take care,
Emergency Medical System
        `
      },
      doctor_assigned: {
        subject: '👨‍⚕️ Doctor Assigned - Report {report_id}',
        sms: 'Doctor Update: Dr. {doctor_name} has been assigned to your case. Report: {report_id}. Hospital: {hospital}',
        email: `
Dear {patient_name},

A doctor has been assigned to your emergency case:

📋 Report ID: {report_id}
👨‍⚕️ Assigned Doctor: Dr. {doctor_name}
🏥 Hospital: {hospital}
⚠️ Criticality: {criticality}
📍 Your Position: #{position} in queue

Dr. {doctor_name} specializes in emergency medicine and will be overseeing your care. Please be prepared for your appointment.

Emergency Response Team
        `
      },
      treatment_ready: {
        subject: '🚨 Ready for Treatment - Report {report_id}',
        sms: 'URGENT: You are now ready for treatment at {hospital}. Please proceed immediately. Dr. {doctor_name} is waiting. Report: {report_id}',
        email: `
Dear {patient_name},

🚨 URGENT: You are now ready for immediate treatment.

📋 Report ID: {report_id}
🏥 Hospital: {hospital}
👨‍⚕️ Doctor: Dr. {doctor_name}
⚠️ Criticality: {criticality}

Please proceed to the hospital immediately. Dr. {doctor_name} is ready to begin your treatment.

IMPORTANT: If you are unable to come immediately, please call the hospital to inform them.

Emergency Response Team
        `
      },
      patient_arrived: {
        subject: '✅ Arrival Confirmed - Report {report_id}',
        sms: 'Hospital Update: Thank you for arriving at {hospital}. You have been checked in and are #{position} in the treatment queue. Wait time: ~{wait_time}min. Report: {report_id}',
        email: `
Dear {patient_name},

✅ We have confirmed your arrival at the hospital.

📋 Report ID: {report_id}
🏥 Hospital: {hospital}
📍 Your Position in Queue: #{position}
⏱️ Estimated Wait Time: {wait_time} minutes
⚠️ Criticality Level: {criticality}

Thank you for arriving safely. You have been checked into our system and our medical team is aware of your presence. Please remain in the waiting area and listen for announcements.

If your condition changes or worsens while waiting, please notify the reception desk immediately.

Hospital Emergency Team
        `
      },
      treatment_started: {
        subject: '🏥 Treatment Started - Report {report_id}',
        sms: 'Treatment Update: Your treatment has begun with Dr. {doctor_name} at {hospital}. You are now receiving medical care. Report: {report_id}',
        email: `
Dear {patient_name},

🏥 Your treatment has officially started.

📋 Report ID: {report_id}
👨‍⚕️ Attending Doctor: Dr. {doctor_name}
🏥 Hospital: {hospital}
⚠️ Criticality: {criticality}
🕐 Treatment Started: {treatment_start_time}

You are now receiving active medical care from our emergency team. Dr. {doctor_name} and the medical staff are providing you with the appropriate treatment for your condition.

A family member or emergency contact will be notified of your status updates as treatment progresses.

Hospital Medical Team
        `
      },
      treatment_completed: {
        subject: '✅ Treatment Completed - Report {report_id}',
        sms: 'Treatment Complete: Your emergency treatment has been completed successfully at {hospital}. Status: {discharge_status}. Follow discharge instructions. Report: {report_id}',
        email: `
Dear {patient_name},

✅ Your emergency treatment has been completed successfully.

📋 Report ID: {report_id}
👨‍⚕️ Treating Doctor: Dr. {doctor_name}
🏥 Hospital: {hospital}
⚠️ Original Criticality: {criticality}
📋 Discharge Status: {discharge_status}
🕐 Treatment Completed: {completion_time}

{treatment_summary}

📄 IMPORTANT DISCHARGE INSTRUCTIONS:
{discharge_instructions}

{follow_up_message}

Thank you for choosing our emergency services. We hope you have a swift recovery.

Hospital Emergency Team
        `
      }
    };
  }

  /**
   * Send queue position update to patient
   */
  async notifyPatientQueueUpdate(reportId, queueData) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        console.log(`Patient report ${reportId} not found`);
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        console.log(`No contact information for patient ${reportId}`);
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        hospital: queueData.hospital_name || 'Hospital',
        position: queueData.queue_position || 'TBD',
        criticality: report.criticality || 'Being assessed',
        patient_status: this.formatPatientStatus(report.patient_status),
        status: this.formatReportStatus(report.status),
        wait_time: queueData.estimated_wait_time ? Math.round(queueData.estimated_wait_time / 60) : 'Unknown'
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.queue_update.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.queue_update.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.queue_update.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'queue_update',
        channels_sent: successful,
        total_channels: notifications.length
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send queue update notification:', error);
      throw error;
    }
  }

  /**
   * Send status update notification to patient
   */
  async notifyPatientStatusUpdate(reportId, newStatus, assignedDoctor = null) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        status: this.formatReportStatus(newStatus),
        status_description: this.getStatusDescription(newStatus),
        criticality: report.criticality || 'Being assessed',
        hospital: report.hospital_name || 'Hospital',
        assigned_doctor: assignedDoctor || 'To be assigned'
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.status_update.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.status_update.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.status_update.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'status_update',
        new_status: newStatus,
        channels_sent: successful
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send status update notification:', error);
      throw error;
    }
  }

  /**
   * Send doctor assignment notification
   */
  async notifyDoctorAssignment(reportId, doctorName, queuePosition = null) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        doctor_name: doctorName,
        hospital: report.hospital_name || 'Hospital',
        criticality: report.criticality || 'Being assessed',
        position: queuePosition || 'In queue'
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.doctor_assigned.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.doctor_assigned.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.doctor_assigned.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'doctor_assigned',
        doctor_name: doctorName,
        channels_sent: successful
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send doctor assignment notification:', error);
      throw error;
    }
  }

  /**
   * Send treatment ready notification (urgent)
   */
  async notifyTreatmentReady(reportId, doctorName) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        doctor_name: doctorName,
        hospital: report.hospital_name || 'Hospital',
        criticality: report.criticality || 'Being assessed'
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.treatment_ready.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.treatment_ready.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'urgent')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.treatment_ready.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'urgent')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'treatment_ready',
        doctor_name: doctorName,
        channels_sent: successful,
        priority: 'urgent'
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send treatment ready notification:', error);
      throw error;
    }
  }

  /**
   * Send patient arrival confirmation notification
   */
  async notifyPatientArrived(reportId, queueData) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        hospital: queueData.hospital_name || 'Hospital',
        position: queueData.queue_position || 'TBD',
        criticality: report.criticality || 'Being assessed',
        wait_time: queueData.estimated_wait_time ? Math.round(queueData.estimated_wait_time / 60) : 'Unknown'
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.patient_arrived.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.patient_arrived.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.patient_arrived.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'patient_arrived',
        queue_position: queueData.queue_position,
        channels_sent: successful
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send patient arrival notification:', error);
      throw error;
    }
  }

  /**
   * Send treatment started notification
   */
  async notifyTreatmentStarted(reportId, doctorName, treatmentStartTime = null) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        doctor_name: doctorName,
        hospital: report.hospital_name || 'Hospital',
        criticality: report.criticality || 'Being assessed',
        treatment_start_time: treatmentStartTime ? new Date(treatmentStartTime).toLocaleString() : new Date().toLocaleString()
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.treatment_started.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.treatment_started.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.treatment_started.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'treatment_started',
        doctor_name: doctorName,
        channels_sent: successful
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send treatment started notification:', error);
      throw error;
    }
  }

  /**
   * Send treatment completed notification
   */
  async notifyTreatmentCompleted(reportId, doctorName, treatmentData = {}) {
    try {
      const reports = await getPatientReports({ report_id: reportId });
      if (reports.length === 0) {
        return { success: false, error: 'Report not found' };
      }

      const report = reports[0];
      const { contact_email, contact_phone, name } = report;

      if (!contact_email && !contact_phone) {
        return { success: false, error: 'No contact information' };
      }

      const templateData = {
        report_id: reportId,
        patient_name: name,
        doctor_name: doctorName,
        hospital: report.hospital_name || 'Hospital',
        criticality: report.criticality || 'Being assessed',
        discharge_status: treatmentData.discharge_status || 'Discharged',
        completion_time: treatmentData.completion_time ? new Date(treatmentData.completion_time).toLocaleString() : new Date().toLocaleString(),
        treatment_summary: treatmentData.treatment_summary || 'Your treatment has been completed successfully.',
        discharge_instructions: treatmentData.discharge_instructions || 'Please follow the discharge instructions provided by your doctor.',
        follow_up_message: treatmentData.follow_up_required ? 
          `🔔 FOLLOW-UP REQUIRED: ${treatmentData.follow_up_notes || 'Please schedule a follow-up appointment as advised by your doctor.'}` : 
          '✅ No follow-up appointment is required at this time.'
      };

      const notifications = [];

      // Send email notification
      if (contact_email) {
        const emailMessage = this.fillTemplate(this.templates.treatment_completed.email, templateData);
        const emailSubject = this.fillTemplate(this.templates.treatment_completed.subject, templateData);
        
        notifications.push(
          queueNotification(reportId, 'email', contact_email, emailMessage, 'normal')
        );
      }

      // Send SMS notification
      if (contact_phone) {
        const smsMessage = this.fillTemplate(this.templates.treatment_completed.sms, templateData);
        
        notifications.push(
          queueNotification(reportId, 'sms', contact_phone, smsMessage, 'normal')
        );
      }

      const results = await Promise.allSettled(notifications);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logEvent('patient_notified', 'patient_notification', reportId, null, null, {
        notification_type: 'treatment_completed',
        doctor_name: doctorName,
        discharge_status: treatmentData.discharge_status,
        channels_sent: successful
      });

      return {
        success: successful > 0,
        channels_sent: successful,
        total_channels: notifications.length
      };

    } catch (error) {
      console.error('Failed to send treatment completed notification:', error);
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
   * Format patient status for display
   */
  formatPatientStatus(status) {
    const statusMap = {
      'conscious': 'Conscious and Alert',
      'unconscious': 'Unconscious - Requires Immediate Attention',
      'stable': 'Stable Condition',
      'critical': 'Critical Condition'
    };
    return statusMap[status] || status;
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
      'Created': 'Your report has been received and is being reviewed by our triage team.',
      'Processing': 'Medical staff are currently processing your emergency report and determining the best course of action.',
      'TriageComplete': 'Your case has been assessed and prioritized. Hospital assignment is in progress.',
      'Assigned': 'You have been assigned to a hospital. Please prepare for travel when contacted.',
      'Arrived': 'You have arrived at the hospital. Please check in at the emergency reception.',
      'InTreatment': 'You are currently receiving medical care from our emergency team.',
      'Completed': 'Your emergency treatment has been completed. Follow any discharge instructions provided.',
      'ProcessingError': 'There was an issue processing your report. Please contact emergency services immediately.'
    };
    return descriptions[status] || 'Status updated.';
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      available_templates: Object.keys(this.templates),
      notification_channels: ['email', 'sms'],
      supported_statuses: [
        'Created', 'Processing', 'TriageComplete', 'Assigned', 
        'Arrived', 'InTreatment', 'Completed', 'ProcessingError'
      ]
    };
  }
}

// Create singleton instance
export const patientNotificationService = new PatientNotificationService();

// Export utility functions
export const notifyPatientQueueUpdate = (reportId, queueData) =>
  patientNotificationService.notifyPatientQueueUpdate(reportId, queueData);

export const notifyPatientStatusUpdate = (reportId, newStatus, assignedDoctor) =>
  patientNotificationService.notifyPatientStatusUpdate(reportId, newStatus, assignedDoctor);

export const notifyDoctorAssignment = (reportId, doctorName, queuePosition) =>
  patientNotificationService.notifyDoctorAssignment(reportId, doctorName, queuePosition);

export const notifyTreatmentReady = (reportId, doctorName) =>
  patientNotificationService.notifyTreatmentReady(reportId, doctorName);

export const notifyPatientArrived = (reportId, queueData) =>
  patientNotificationService.notifyPatientArrived(reportId, queueData);

export const notifyTreatmentStarted = (reportId, doctorName, treatmentStartTime) =>
  patientNotificationService.notifyTreatmentStarted(reportId, doctorName, treatmentStartTime);

export const notifyTreatmentCompleted = (reportId, doctorName, treatmentData) =>
  patientNotificationService.notifyTreatmentCompleted(reportId, doctorName, treatmentData);
