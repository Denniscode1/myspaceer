import { useEffect, useState } from 'react';
import './RealtimeNotifications.css';

/**
 * Realtime notification toast component
 * Displays incoming WebSocket notifications with auto-dismiss
 */
export const RealtimeNotifications = ({ 
  queueUpdate, 
  statusUpdate, 
  doctorAssignment,
  treatmentReady,
  newPatientArrival,
  systemAlert,
  onClear 
}) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (queueUpdate) {
      addNotification({
        id: `queue-${Date.now()}`,
        type: 'queue',
        icon: '🚑',
        title: 'Queue Position Updated',
        message: `You are now position #${queueUpdate.queuePosition} at ${queueUpdate.hospitalName}. Estimated wait: ${Math.round(queueUpdate.estimatedWaitTime / 60)} minutes.`,
        severity: 'info'
      });
      onClear?.clearQueueUpdate?.();
    }
  }, [queueUpdate, onClear]);

  useEffect(() => {
    if (statusUpdate) {
      addNotification({
        id: `status-${Date.now()}`,
        type: 'status',
        icon: '📋',
        title: 'Status Update',
        message: `Your status has been updated to: ${statusUpdate.status}${statusUpdate.assignedDoctor ? ` (Doctor: ${statusUpdate.assignedDoctor})` : ''}`,
        severity: 'info'
      });
      onClear?.clearStatusUpdate?.();
    }
  }, [statusUpdate, onClear]);

  useEffect(() => {
    if (doctorAssignment) {
      addNotification({
        id: `doctor-${Date.now()}`,
        type: 'doctor',
        icon: '👨‍⚕️',
        title: 'Doctor Assigned',
        message: `${doctorAssignment.doctorName} has been assigned to your case.`,
        severity: 'success'
      });
      onClear?.clearDoctorAssignment?.();
    }
  }, [doctorAssignment, onClear]);

  useEffect(() => {
    if (treatmentReady) {
      addNotification({
        id: `treatment-${Date.now()}`,
        type: 'treatment',
        icon: '⏰',
        title: 'Ready for Treatment',
        message: treatmentReady.message || `Dr. ${treatmentReady.doctorName} is ready to see you now!`,
        severity: 'warning',
        persistent: true
      });
      onClear?.clearTreatmentReady?.();
    }
  }, [treatmentReady, onClear]);

  useEffect(() => {
    if (newPatientArrival) {
      addNotification({
        id: `arrival-${Date.now()}`,
        type: 'arrival',
        icon: '🚨',
        title: 'New Patient Arrival',
        message: `${newPatientArrival.name} - ${newPatientArrival.criticality} (${newPatientArrival.incidentType}). ETA: ${new Date(newPatientArrival.eta).toLocaleTimeString()}`,
        severity: 'warning'
      });
      onClear?.clearNewPatientArrival?.();
    }
  }, [newPatientArrival, onClear]);

  useEffect(() => {
    if (systemAlert) {
      addNotification({
        id: `alert-${Date.now()}`,
        type: 'alert',
        icon: '⚠️',
        title: 'System Alert',
        message: systemAlert.message,
        severity: systemAlert.severity || 'error',
        persistent: true
      });
      onClear?.clearSystemAlert?.();
    }
  }, [systemAlert, onClear]);

  const addNotification = (notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss after 10 seconds unless persistent
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 10000);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="realtime-notifications-container">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`realtime-notification realtime-notification--${notification.severity}`}
        >
          <div className="realtime-notification__icon">
            {notification.icon}
          </div>
          <div className="realtime-notification__content">
            <div className="realtime-notification__title">
              {notification.title}
            </div>
            <div className="realtime-notification__message">
              {notification.message}
            </div>
            <div className="realtime-notification__time">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          <button 
            className="realtime-notification__close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
