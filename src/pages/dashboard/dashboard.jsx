import React, { useState } from 'react';
import './dashboard.css';
import QueueManagement from '../../components/QueueManagement.jsx';
import TreatedSection from '../../components/TreatedSection.jsx';

const Dashboard = ({ submissions, onBackToForm, onLogout, onRefresh, user, isLoading, onDeletePatient }) => {
  const [activeTab, setActiveTab] = useState('patients');
  const [notifications, setNotifications] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleNotificationSent = (message) => {
    const notification = {
      id: Date.now(),
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'severe': return '#e74c3c';
      case 'moderate': return '#f39c12';
      case 'mild': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const formatLocation = (location) => {
    if (location && location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return 'Unknown';
  };

  const handleDeleteClick = (submission) => {
    setDeleteConfirmation({
      patient: submission,
      isOpen: true
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation?.patient || !onDeletePatient) return;
    
    try {
      await onDeletePatient(deleteConfirmation.patient.id || deleteConfirmation.patient.reportId);
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Failed to delete patient:', error);
      // Error handling is done in parent component
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  // Check if user has permission to delete (doctor or nurse)
  const canDelete = user && (user.role === 'doctor' || user.role === 'nurse');

  return (
    <div className="dashboard-container">
      {/* Delete Confirmation Dialog */}
      {deleteConfirmation?.isOpen && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Patient Deletion</h3>
            <p>
              Are you sure you want to delete the patient record for{' '}
              <strong>{deleteConfirmation.patient.name}</strong>?
            </p>
            <p className="warning-text">
              This action cannot be undone and will permanently remove all patient data including:
            </p>
            <ul className="deletion-list">
              <li>Patient information and medical history</li>
              <li>Triage and hospital assignment records</li>
              <li>Queue position and treatment data</li>
              <li>All related notifications and logs</li>
            </ul>
            <div className="modal-actions">
              <button 
                className="cancel-button" 
                onClick={handleDeleteCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-button" 
                onClick={handleDeleteConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Emergency Response Dashboard</h1>
          {user && (
            <p className="welcome-message">Welcome, Dr. {user.username}</p>
          )}
        </div>
        <div className="header-actions">
          {/* Notifications Bell */}
          <div className="notifications-container">
            <button className="notifications-bell">
              🔔 {notifications.filter(n => !n.read).length > 0 && (
                <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
              )}
            </button>
            <div className="notifications-dropdown">
              {notifications.length === 0 ? (
                <div className="no-notifications">No notifications</div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{new Date(notification.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {onRefresh && (
            <button 
              className="refresh-button" 
              onClick={onRefresh}
              disabled={isLoading}
              style={{ marginRight: '10px' }}
            >
              {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          )}
          <button className="back-button" onClick={onBackToForm}>
            ← Back to Form
          </button>
          {onLogout && (
            <button className="logout-button" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          📋 Patient Records
        </button>
        <button 
          className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          🏥 Queue Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'treated' ? 'active' : ''}`}
          onClick={() => setActiveTab('treated')}
        >
          ✅ Treated Patients
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'patients' && (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3>Total Submissions</h3>
                <div className="stat-number">{submissions.length}</div>
              </div>
              <div className="stat-card">
                <h3>Severe Cases</h3>
                <div className="stat-number critical">
                  {submissions.filter(s => s.criticality === 'severe').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Moderate Cases</h3>
                <div className="stat-number urgent">
                  {submissions.filter(s => s.criticality === 'moderate').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Mild Cases</h3>
                <div className="stat-number mild">
                  {submissions.filter(s => s.criticality === 'mild').length}
                </div>
              </div>
            </div>

            {isLoading && submissions.length === 0 ? (
              <div className="no-data">
                <p>Loading patient data...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="no-data">
                <p>No patient records found. Submit a form to see data here.</p>
              </div>
            ) : (
              <div className="submissions-table-container">
                <h2>Recent Submissions</h2>
                <div className="table-wrapper">
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>Submitted At</th>
                        <th>Name</th>
                        <th>TRN</th>
                        <th>Age Range</th>
                        <th>Gender</th>
                        <th>Incident</th>
                        <th>Criticality</th>
                        <th>Status</th>
                        <th>Transportation</th>
                        <th>Travel Time</th>
                        <th>Location</th>
                        {canDelete && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((submission, index) => (
                        <tr key={submission.id || index}>
                          <td>{formatDate(submission.submittedAt)}</td>
                          <td className="name-cell">{submission.name}</td>
                          <td>{submission.trn || 'N/A'}</td>
                          <td>{submission.ageRange}</td>
                          <td>{submission.gender}</td>
                          <td className="incident-cell">
                            {submission.incident === 'other' 
                              ? submission.customIncident 
                              : submission.incident}
                          </td>
                          <td>
                            <span 
                              className="criticality-badge"
                              style={{ backgroundColor: getCriticalityColor(submission.criticality) }}
                            >
                              {submission.criticality}
                            </span>
                          </td>
                          <td>{submission.patientStatus}</td>
                          <td>{submission.transportationMode}</td>
                          <td>{submission.estimatedTravelTime}</td>
                          <td className="location-cell">
                            {formatLocation(submission.location)}
                          </td>
                          {canDelete && (
                            <td className="actions-cell">
                              <button 
                                className="delete-button"
                                onClick={() => handleDeleteClick(submission)}
                                title="Delete Patient"
                                disabled={isLoading}
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'queue' && (
          <QueueManagement 
            user={user} 
            onNotificationSent={handleNotificationSent}
          />
        )}

        {activeTab === 'treated' && (
          <TreatedSection 
            user={user}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;