import React, { useState, useEffect } from 'react';
import './QueueManagement.css';
import TreatmentCompletionModal from './TreatmentCompletionModal.jsx';
import LocationDetector from './LocationDetector.jsx';
import LocationSettings from './LocationSettings.jsx';

// API base URL - use relative path in production, localhost in dev
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const QueueManagement = ({ user, onNotificationSent }) => {
  const [queueData, setQueueData] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [completionModal, setCompletionModal] = useState({ show: false, patient: null });
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  // Doctor contact information for notifications
  const [doctorContact, setDoctorContact] = useState({
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // Fetch queue data
  const fetchQueueData = async () => {
    if (!selectedHospital) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/queue/${selectedHospital}`);
      const data = await response.json();
      
      if (data.success) {
        setQueueData(data.data.queue_items || []);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      showNotification('Failed to load queue data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch hospitals with location-based enhancements
  const fetchHospitals = async (locationData = null) => {
    try {
      let hospitalUrl = `${API_BASE_URL}/hospitals`;
      
      // Use provided location data or stored user location
      const location = locationData || userLocation;
      
      if (location && location.latitude && location.longitude) {
        hospitalUrl += `?latitude=${location.latitude}&longitude=${location.longitude}&criticality=moderate&transportation_mode=self-carry`;
        console.log('🌍 Fetching hospitals with location:', {
          lat: location.latitude.toFixed(4),
          lng: location.longitude.toFixed(4),
          accuracy: location.accuracy ? `±${Math.round(location.accuracy)}m` : 'unknown',
          inJamaica: location.inJamaica
        });
      } else {
        console.log('📍 Fetching hospitals without location data');
      }
      
      const response = await fetch(hospitalUrl);
      const data = await response.json();
      
      if (data.success) {
        // Sort hospitals by priority if available, otherwise by name
        const sortedHospitals = data.data.sort((a, b) => {
          if (a.priority_score && b.priority_score) {
            return b.priority_score - a.priority_score;
          }
          return a.name.localeCompare(b.name);
        });
        
        setHospitals(sortedHospitals);
        if (sortedHospitals.length > 0) {
          setSelectedHospital(sortedHospitals[0].hospital_id);
        }
        
        // Show success notification with location info if available
        if (data.metadata && data.metadata.user_location) {
          const distanceInfo = sortedHospitals[0]?.distance_km 
            ? ` (closest: ${sortedHospitals[0].name} - ${sortedHospitals[0].distance_km}km)`
            : '';
          showNotification(
            `✅ Loaded ${sortedHospitals.length} hospitals sorted by distance${distanceInfo}`, 
            'success'
          );
        } else {
          showNotification(`📋 Loaded ${sortedHospitals.length} hospitals (no location sorting)`, 'success');
        }
      }
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
      showNotification('Failed to load hospitals', 'error');
    }
  };

  // Handle location updates from LocationDetector
  const handleLocationUpdate = (locationData) => {
    console.log('📍 Location updated:', locationData);
    setUserLocation(locationData);
    setLocationStatus('success');
    
    // Automatically refresh hospitals with new location
    fetchHospitals(locationData);
  };

  const handleLocationError = (error, geoError) => {
    console.error('❌ Location error:', error, geoError);
    setLocationStatus('error');
    
    // Still fetch hospitals without location
    fetchHospitals();
  };

  // Manual location refresh
  const refreshLocation = () => {
    setLocationStatus('detecting');
    // This will be handled by the LocationDetector component
  };

  // Update patient status
  const updatePatientStatus = async (reportId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          user_id: user?.id || 'doctor_unknown',
          user_role: 'doctor'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`Patient status updated to: ${newStatus}`, 'success');
        
        // Send notification to doctor
        await sendDoctorNotification(`Patient ${reportId} status updated to ${newStatus}`);
        
        // Refresh queue data
        fetchQueueData();
        
        if (onNotificationSent) {
          onNotificationSent(`Status updated: ${newStatus}`);
        }
      } else {
        showNotification(`Failed to update status: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update patient status:', error);
      showNotification('Failed to update patient status', 'error');
    }
  };

  // Move patient in queue
  const movePatientInQueue = async (reportId, direction) => {
    try {
      const response = await fetch(`${API_BASE_URL}/queue/${reportId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          direction,
          doctor_id: user?.id || 'doctor_unknown'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`Patient moved ${direction} in queue`, 'success');
        
        // Send notification to doctor
        await sendDoctorNotification(`Queue updated: Patient ${reportId} moved ${direction}`);
        
        // Refresh queue data
        fetchQueueData();
        
        if (onNotificationSent) {
          onNotificationSent(`Queue updated: Patient moved ${direction}`);
        }
      } else {
        showNotification(`Failed to move patient: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to move patient in queue:', error);
      showNotification('Failed to move patient in queue', 'error');
    }
  };

  // Start treatment (do NOT remove from queue yet)
  const startTreatment = async (reportId) => {
    try {
      // Only update patient status to "In Treatment" - keep them in queue
      const statusUpdateResponse = await fetch(`${API_BASE_URL}/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'InTreatment',
          user_id: user?.id || 'doctor_unknown',
          user_role: 'doctor'
        })
      });

      const statusResult = await statusUpdateResponse.json();
      
      if (statusResult.success) {
        showNotification('Treatment started - patient remains in queue until completion', 'success');
        
        // Send notification to doctor
        await sendDoctorNotification(`Treatment started for patient ${reportId}`);
        
        // Refresh queue data to show updated status
        fetchQueueData();
        
        if (onNotificationSent) {
          onNotificationSent('Treatment started');
        }
      } else {
        throw new Error(statusResult.error || 'Failed to update patient status');
      }
    } catch (error) {
      console.error('Failed to start treatment:', error);
      showNotification(`Failed to start treatment: ${error.message}`, 'error');
    }
  };

  // Show completion modal
  const showCompletionModal = (patient) => {
    setCompletionModal({ show: true, patient });
  };

  // Handle treatment completion
  const handleTreatmentCompletion = async (completionData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complete-treatment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completionData)
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification('Treatment completed successfully - patient moved to treated section!', 'success');
        
        // Send notification to doctor
        await sendDoctorNotification(`Treatment completed for patient ${completionData.report_id}. Patient has been moved to treated section.`);
        
        // Refresh queue data
        fetchQueueData();
        
        if (onNotificationSent) {
          onNotificationSent('Treatment completed and patient moved to treated section');
        }
      } else {
        showNotification(`Failed to complete treatment: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to complete treatment:', error);
      showNotification('Failed to complete treatment', 'error');
    }
  };

  // Send notification to doctor
  const sendDoctorNotification = async (message) => {
    try {
      const notificationPromises = [];
      
      // Send email notification if email provided
      if (doctorContact.email) {
        notificationPromises.push(
          fetch(`${API_BASE_URL}/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'email',
              recipient: doctorContact.email,
              subject: 'Queue Update - Emergency Triage System',
              message: `Dr. ${user?.username || 'Doctor'}, ${message}`,
              priority: 'normal'
            })
          })
        );
      }

      // Send SMS notification if phone provided
      if (doctorContact.phone) {
        notificationPromises.push(
          fetch(`${API_BASE_URL}/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'sms',
              recipient: doctorContact.phone,
              message: `Dr. ${user?.username || 'Doctor'}, ${message}`,
              priority: 'normal'
            })
          })
        );
      }

      await Promise.allSettled(notificationPromises);
      
    } catch (error) {
      console.error('Failed to send doctor notification:', error);
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'severe': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'moderate': return '#f39c12';
      case 'low': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  // Format wait time
  const formatWaitTime = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  useEffect(() => {
    // Don't fetch hospitals immediately - wait for location detection
    // fetchHospitals will be called by handleLocationUpdate or handleLocationError
  }, []);

  useEffect(() => {
    if (selectedHospital) {
      fetchQueueData();
      const interval = setInterval(fetchQueueData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [selectedHospital]);

  return (
    <div className="queue-management">
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification({ show: false, message: '', type: '' })}>
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="queue-header">
        <h2>🏥 Queue Management</h2>
        <div className="queue-controls">
          {/* Hospital Selection */}
          <select 
            value={selectedHospital} 
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="hospital-select"
          >
            <option value="">Select Hospital</option>
            {hospitals.map(hospital => {
              const distanceInfo = hospital.distance_km 
                ? `${hospital.distance_km}km • ${hospital.travel_time_minutes}min` 
                : '';
              const displayName = distanceInfo 
                ? `${hospital.name} (${distanceInfo})`
                : hospital.name;
              
              return (
                <option key={hospital.hospital_id} value={hospital.hospital_id}>
                  {displayName}
                </option>
              );
            })}
          </select>

          {/* Refresh Button */}
          <button 
            onClick={fetchQueueData} 
            disabled={isLoading || !selectedHospital}
            className="refresh-btn"
          >
            {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Location Detection */}
      <div className="location-section">
        <div className="section-header">
          <h3>📍 Location & Hospital Selection</h3>
          <button 
            className="toggle-details-btn"
            onClick={() => setShowLocationDetails(!showLocationDetails)}
          >
            {showLocationDetails ? '▲ Hide Details' : '▼ Show Details'}
          </button>
        </div>
        
        <LocationDetector 
          onLocationUpdate={handleLocationUpdate}
          onLocationError={handleLocationError}
        />
        
        <LocationSettings 
          onPreferenceChange={(format) => {
            console.log('Location display preference changed to:', format);
            // Optionally trigger a refresh of displayed data
          }}
        />
        
        {showLocationDetails && userLocation && (
          <div className="location-details-panel">
            <h4>📊 Location Details</h4>
            <div className="location-info-grid">
              {userLocation.placeName && (
                <div className="info-item">
                  <strong>Location:</strong> {userLocation.placeName}
                </div>
              )}
              <div className="info-item">
                <strong>Coordinates:</strong> {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
              </div>
              <div className="info-item">
                <strong>Accuracy:</strong> ±{Math.round(userLocation.accuracy || 0)}m
              </div>
              <div className="info-item">
                <strong>Country:</strong> {userLocation.inJamaica ? '🇯🇲 Jamaica' : '🌍 Outside Jamaica'}
              </div>
              <div className="info-item">
                <strong>Detection Time:</strong> {new Date(userLocation.timestamp).toLocaleString()}
              </div>
              <div className="info-item">
                <strong>Source:</strong> {userLocation.source === 'gps' ? '📡 GPS' : '📁 Cached'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Contact Settings */}
      <div className="doctor-contact-settings">
        <h3>📱 Notification Settings</h3>
        <div className="contact-inputs">
          <input
            type="email"
            placeholder="Your email for notifications"
            value={doctorContact.email}
            onChange={(e) => setDoctorContact(prev => ({ ...prev, email: e.target.value }))}
            className="contact-input"
          />
          <input
            type="tel"
            placeholder="Your phone for SMS (e.g., +1234567890)"
            value={doctorContact.phone}
            onChange={(e) => setDoctorContact(prev => ({ ...prev, phone: e.target.value }))}
            className="contact-input"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="queue-table-container">
        {isLoading ? (
          <div className="loading">Loading queue data...</div>
        ) : queueData.length === 0 ? (
          <div className="no-queue-data">
            {selectedHospital ? 'No patients in queue' : 'Please select a hospital'}
          </div>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Patient</th>
                <th>Age Range</th>
                <th>Incident</th>
                <th>Criticality</th>
                <th>Status</th>
                <th>Est. Wait</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueData.map((patient, index) => {
                const isInTreatment = patient.patient_status?.toLowerCase() === 'intreatment' || patient.patient_status?.toLowerCase() === 'in treatment';
                const isNext = patient.queue_position === 1;
                
                return (
                <tr key={patient.report_id} className={`queue-row ${isNext ? 'next-patient' : ''} ${isInTreatment ? 'in-treatment' : ''}`}>
                  <td className="position-cell">
                    <span className={`position-badge ${patient.queue_position === 1 ? 'next' : ''}`}>
                      #{patient.queue_position}
                    </span>
                  </td>
                  <td className="patient-cell">
                    <strong>{patient.name}</strong>
                    <br />
                    <small>ID: {patient.report_id}</small>
                  </td>
                  <td>{patient.age_range}</td>
                  <td className="incident-cell">
                    {patient.incident_type}
                    {patient.incident_description && (
                      <div className="incident-description">
                        {patient.incident_description.substring(0, 50)}...
                      </div>
                    )}
                  </td>
                  <td>
                    <span 
                      className="criticality-badge"
                      style={{ backgroundColor: getStatusColor(patient.criticality) }}
                    >
                      {patient.criticality || 'Pending'}
                    </span>
                  </td>
                  <td>{patient.patient_status}</td>
                  <td>{formatWaitTime(patient.estimated_wait_time)}</td>
                  <td>{new Date(patient.submitted_at).toLocaleTimeString()}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      {/* Move Up/Down */}
                      {patient.queue_position > 1 && (
                        <button 
                          className="action-btn move-up"
                          onClick={() => movePatientInQueue(patient.report_id, 'up')}
                          title="Move up in queue"
                        >
                          ⬆️
                        </button>
                      )}
                      
                      {patient.queue_position < queueData.length && (
                        <button 
                          className="action-btn move-down"
                          onClick={() => movePatientInQueue(patient.report_id, 'down')}
                          title="Move down in queue"
                        >
                          ⬇️
                        </button>
                      )}

                      {/* Start Treatment */}
                      <button 
                        className="action-btn start-treatment"
                        onClick={() => startTreatment(patient.report_id)}
                        title="Start treatment"
                      >
                        🏥 Start
                      </button>

                      {/* Complete Treatment Button */}
                      <button 
                        className="action-btn complete-treatment"
                        onClick={() => showCompletionModal(patient)}
                        title="Complete treatment"
                      >
                        ✅ Complete
                      </button>

                      {/* Status Updates */}
                      <select 
                        className="status-select"
                        onChange={(e) => {
                          if (e.target.value) {
                            updatePatientStatus(patient.report_id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Update Status</option>
                        <option value="Arrived">Mark Arrived</option>
                        <option value="InTreatment">In Treatment</option>
                      </select>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Hospital Information */}
      {selectedHospital && (() => {
        const selectedHospitalData = hospitals.find(h => h.hospital_id === selectedHospital);
        return selectedHospitalData ? (
          <div className="hospital-info">
            <h3>🏥 {selectedHospitalData.name}</h3>
            <div className="hospital-details">
              <div className="detail-item">
                <strong>Location:</strong> {selectedHospitalData.address || 'Address not available'}
              </div>
              {selectedHospitalData.latitude && selectedHospitalData.longitude && (
                <div className="detail-item">
                  <strong>Coordinates:</strong> {selectedHospitalData.latitude.toFixed(4)}, {selectedHospitalData.longitude.toFixed(4)}
                </div>
              )}
              {selectedHospitalData.distance_km && (
                <div className="detail-item">
                  <strong>Distance:</strong> {selectedHospitalData.distance_km}km 
                  <span style={{ color: '#666', marginLeft: '10px' }}>⏱ {selectedHospitalData.travel_time_minutes} minutes</span>
                </div>
              )}
              <div className="detail-item">
                <strong>Capacity:</strong> {selectedHospitalData.capacity} beds
                {selectedHospitalData.current_load && (
                  <span style={{ color: '#666', marginLeft: '10px' }}>({selectedHospitalData.current_load} currently occupied)</span>
                )}
              </div>
              {selectedHospitalData.specialties && (
                <div className="detail-item">
                  <strong>Specialties:</strong> 
                  <div className="specialties-list">
                    {(typeof selectedHospitalData.specialties === 'string' 
                      ? JSON.parse(selectedHospitalData.specialties) 
                      : selectedHospitalData.specialties
                    ).map(specialty => (
                      <span key={specialty} className="specialty-badge">{specialty}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null;
      })()}

      {/* Queue Statistics */}
      <div className="queue-stats">
        <div className="stat-card">
          <h4>Patients in Queue</h4>
          <div className="stat-value">{queueData.length}</div>
        </div>
        <div className="stat-card">
          <h4>Next Patient</h4>
          <div className="stat-value">
            {queueData.length > 0 ? queueData[0]?.name : 'None'}
          </div>
        </div>
        <div className="stat-card">
          <h4>Avg Wait Time</h4>
          <div className="stat-value">
            {queueData.length > 0 
              ? formatWaitTime(queueData.reduce((sum, p) => sum + (p.estimated_wait_time || 0), 0) / queueData.length)
              : '0 min'
            }
          </div>
        </div>
        {selectedHospital && (() => {
          const selectedHospitalData = hospitals.find(h => h.hospital_id === selectedHospital);
          return selectedHospitalData?.location_status ? (
            <div className="stat-card">
              <h4>Location Status</h4>
              <div className="stat-value" style={{ fontSize: '14px' }}>
                {selectedHospitalData.location_status === 'calculated' ? '📍 GPS Located' :
                 selectedHospitalData.location_status === 'unknown' ? '❓ Location Unknown' :
                 '📍 Manual Entry'}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Treatment Completion Modal */}
      <TreatmentCompletionModal 
        patient={completionModal.patient}
        isOpen={completionModal.show}
        onClose={() => setCompletionModal({ show: false, patient: null })}
        onComplete={handleTreatmentCompletion}
        user={user}
      />
    </div>
  );
};

export default QueueManagement;
