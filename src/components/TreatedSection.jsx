import React, { useState, useEffect } from 'react';
import './TreatedSection.css';

const TreatedSection = ({ user }) => {
  const [treatedPatients, setTreatedPatients] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: ''
  });
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch treated patients with filters
  const fetchTreatedPatients = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (selectedHospital) queryParams.append('hospital_id', selectedHospital);
      if (user?.id) queryParams.append('treating_doctor_id', user.id);
      if (dateFilter.from) queryParams.append('date_from', dateFilter.from);
      if (dateFilter.to) queryParams.append('date_to', dateFilter.to);
      if (outcomeFilter) queryParams.append('outcome', outcomeFilter);

      const response = await fetch(`http://localhost:3001/api/treated-patients?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setTreatedPatients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch treated patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch hospitals
  const fetchHospitals = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/hospitals');
      const data = await response.json();
      
      if (data.success) {
        setHospitals(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const queryParams = selectedHospital ? `?hospital_id=${selectedHospital}` : '';
      const response = await fetch(`http://localhost:3001/api/treated-patients/stats${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Filter patients based on search term
  const filteredPatients = treatedPatients.filter(patient => 
    patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.trn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.incident_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Get outcome color
  const getOutcomeColor = (outcome) => {
    switch (outcome?.toLowerCase()) {
      case 'successful': return '#2ecc71';
      case 'stable': return '#3498db';
      case 'improved': return '#27ae60';
      case 'transferred': return '#f39c12';
      case 'complications': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  // Get criticality color
  const getCriticalityColor = (criticality) => {
    switch (criticality?.toLowerCase()) {
      case 'severe': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'moderate': return '#f39c12';
      case 'low': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  // Show patient details
  const showPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    fetchTreatedPatients();
    fetchStats();
  }, [selectedHospital, dateFilter, outcomeFilter]);

  return (
    <div className="treated-section">
      <div className="treated-header">
        <h2>✅ Treated Patients</h2>
        <div className="header-stats">
          {stats && (
            <>
              <div className="stat-item">
                <span className="stat-label">Total Treated:</span>
                <span className="stat-value">{stats.overall?.total_treated || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Duration:</span>
                <span className="stat-value">{formatDuration(stats.overall?.avg_treatment_duration)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Satisfaction:</span>
                <span className="stat-value">{stats.overall?.avg_satisfaction ? `${stats.overall.avg_satisfaction.toFixed(1)}/5` : 'N/A'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="treated-filters">
        <div className="filter-group">
          <label>Hospital:</label>
          <select 
            value={selectedHospital} 
            onChange={(e) => setSelectedHospital(e.target.value)}
          >
            <option value="">All Hospitals</option>
            {hospitals.map(hospital => (
              <option key={hospital.hospital_id} value={hospital.hospital_id}>
                {hospital.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Date From:</label>
          <input
            type="date"
            value={dateFilter.from}
            onChange={(e) => setDateFilter(prev => ({...prev, from: e.target.value}))}
          />
        </div>

        <div className="filter-group">
          <label>Date To:</label>
          <input
            type="date"
            value={dateFilter.to}
            onChange={(e) => setDateFilter(prev => ({...prev, to: e.target.value}))}
          />
        </div>

        <div className="filter-group">
          <label>Outcome:</label>
          <select 
            value={outcomeFilter} 
            onChange={(e) => setOutcomeFilter(e.target.value)}
          >
            <option value="">All Outcomes</option>
            <option value="successful">Successful</option>
            <option value="stable">Stable</option>
            <option value="improved">Improved</option>
            <option value="transferred">Transferred</option>
            <option value="complications">Complications</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search by name, TRN, or incident..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="refresh-btn" onClick={fetchTreatedPatients} disabled={isLoading}>
          {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Results */}
      <div className="treated-results">
        {isLoading ? (
          <div className="loading">Loading treated patients...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="no-data">No treated patients found matching your criteria.</div>
        ) : (
          <div className="treated-table-container">
            <table className="treated-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>TRN</th>
                  <th>Age</th>
                  <th>Incident</th>
                  <th>Original Criticality</th>
                  <th>Hospital</th>
                  <th>Doctor</th>
                  <th>Duration</th>
                  <th>Completed</th>
                  <th>Outcome</th>
                  <th>Satisfaction</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="patient-cell">
                      <strong>{patient.patient_name}</strong>
                      <br />
                      <small>{patient.gender}</small>
                    </td>
                    <td>{patient.trn || 'N/A'}</td>
                    <td>{patient.age_range}</td>
                    <td className="incident-cell">
                      <div>{patient.incident_type}</div>
                      {patient.incident_description && (
                        <small className="incident-description">
                          {patient.incident_description.substring(0, 30)}...
                        </small>
                      )}
                    </td>
                    <td>
                      <span 
                        className="criticality-badge"
                        style={{ backgroundColor: getCriticalityColor(patient.original_criticality) }}
                      >
                        {patient.original_criticality || 'N/A'}
                      </span>
                    </td>
                    <td>{patient.hospital_name}</td>
                    <td>{patient.treating_doctor_name || 'N/A'}</td>
                    <td>{formatDuration(patient.treatment_duration_minutes)}</td>
                    <td>{formatDate(patient.treatment_completed_at)}</td>
                    <td>
                      <span 
                        className="outcome-badge"
                        style={{ backgroundColor: getOutcomeColor(patient.treatment_outcome) }}
                      >
                        {patient.treatment_outcome || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {patient.patient_satisfaction_rating ? (
                        <div className="satisfaction-rating">
                          {'⭐'.repeat(patient.patient_satisfaction_rating)}
                          <small>({patient.patient_satisfaction_rating}/5)</small>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td>
                      <button 
                        className="view-details-btn"
                        onClick={() => showPatientDetails(patient)}
                      >
                        📋 Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Patient Treatment Details</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Patient Name:</label>
                  <span>{selectedPatient.patient_name}</span>
                </div>
                <div className="detail-item">
                  <label>TRN:</label>
                  <span>{selectedPatient.trn || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Age Range:</label>
                  <span>{selectedPatient.age_range}</span>
                </div>
                <div className="detail-item">
                  <label>Gender:</label>
                  <span>{selectedPatient.gender}</span>
                </div>
                <div className="detail-item">
                  <label>Incident Type:</label>
                  <span>{selectedPatient.incident_type}</span>
                </div>
                <div className="detail-item">
                  <label>Incident Description:</label>
                  <span>{selectedPatient.incident_description || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Original Criticality:</label>
                  <span 
                    className="criticality-badge"
                    style={{ backgroundColor: getCriticalityColor(selectedPatient.original_criticality) }}
                  >
                    {selectedPatient.original_criticality || 'N/A'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Hospital:</label>
                  <span>{selectedPatient.hospital_name}</span>
                </div>
                <div className="detail-item">
                  <label>Treating Doctor:</label>
                  <span>{selectedPatient.treating_doctor_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Treatment Started:</label>
                  <span>{selectedPatient.treatment_started_at ? formatDate(selectedPatient.treatment_started_at) : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Treatment Completed:</label>
                  <span>{formatDate(selectedPatient.treatment_completed_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Duration:</label>
                  <span>{formatDuration(selectedPatient.treatment_duration_minutes)}</span>
                </div>
                <div className="detail-item">
                  <label>Treatment Outcome:</label>
                  <span 
                    className="outcome-badge"
                    style={{ backgroundColor: getOutcomeColor(selectedPatient.treatment_outcome) }}
                  >
                    {selectedPatient.treatment_outcome || 'N/A'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Discharge Status:</label>
                  <span>{selectedPatient.discharge_status}</span>
                </div>
                <div className="detail-item">
                  <label>Patient Satisfaction:</label>
                  <span>
                    {selectedPatient.patient_satisfaction_rating ? (
                      <>{'⭐'.repeat(selectedPatient.patient_satisfaction_rating)} ({selectedPatient.patient_satisfaction_rating}/5)</>
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="detail-item full-width">
                  <label>Treatment Notes:</label>
                  <div className="notes-content">
                    {selectedPatient.treatment_notes || 'No treatment notes recorded.'}
                  </div>
                </div>
                {selectedPatient.follow_up_required && (
                  <div className="detail-item full-width">
                    <label>Follow-up Notes:</label>
                    <div className="notes-content follow-up">
                      {selectedPatient.follow_up_notes || 'Follow-up required - no specific notes.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatedSection;