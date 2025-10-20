import React from 'react';
import './ModernDataTable.css';

const ModernDataTable = ({ submissions, onDeletePatient, canDelete, isLoading, onViewDetails, onEditPatient }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLocation = (location) => {
    if (location && location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return 'Unknown';
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'severe': return 'critical';
      case 'moderate': return 'warning';
      case 'mild': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'treated': return 'success';
      case 'in treatment': return 'warning';
      case 'waiting': return 'info';
      case 'critical': return 'critical';
      default: return 'default';
    }
  };

  if (!submissions || submissions.length === 0) {
    return (
      <div className="modern-table-container">
        <div className="table-header">
          <h2>Patient Records</h2>
          <div className="table-actions">
            <button className="export-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Export
            </button>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Patient Records</h3>
          <p>No patient records found. Submit a form to see data here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-table-container">
      <div className="table-header">
        <h2>Patient Records</h2>
        <div className="table-actions">
          <button className="filter-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Filter
          </button>
          <button className="export-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
              <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" className="select-all-checkbox" />
              </th>
              <th>Patient</th>
              <th>TRN</th>
              <th>Age</th>
              <th>Incident</th>
              <th>Criticality</th>
              <th>Status</th>
              <th>Transportation</th>
              <th>Submitted</th>
              {canDelete && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission, index) => (
              <tr key={submission.id || index} className="table-row">
                <td>
                  <input type="checkbox" className="row-checkbox" />
                </td>
                <td className="patient-cell">
                  <div className="patient-info">
                    <div className="patient-avatar">
                      <span>{submission.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="patient-details">
                      <div className="patient-name">{submission.name}</div>
                      <div className="patient-meta">{submission.gender}</div>
                    </div>
                  </div>
                </td>
                <td className="trn-cell">{submission.trn || 'N/A'}</td>
                <td>{submission.ageRange}</td>
                <td className="incident-cell">
                  {submission.incident === 'other' 
                    ? submission.customIncident 
                    : submission.incident}
                </td>
                <td>
                  <span className={`status-badge ${getCriticalityColor(submission.criticality)}`}>
                    {submission.criticality}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusColor(submission.patientStatus)}`}>
                    {submission.patientStatus || 'Pending'}
                  </span>
                </td>
                <td className="transport-cell">{submission.transportationMode}</td>
                <td className="date-cell">{formatDate(submission.submittedAt)}</td>
                {canDelete && (
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button 
                        className="action-btn view-btn"
                        onClick={() => onViewDetails && onViewDetails(submission)}
                        title="View Details"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => onEditPatient && onEditPatient(submission)}
                        title="Edit Patient"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => onDeletePatient(submission)}
                        disabled={isLoading}
                        title="Delete Patient"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="table-footer">
        <div className="showing-results">
          Showing <strong>1-{submissions.length}</strong> of <strong>{submissions.length}</strong> results
        </div>
        <div className="table-pagination">
          <button className="pagination-btn" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="15,18 9,12 15,6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <span className="pagination-info">Page 1 of 1</span>
          <button className="pagination-btn" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="9,18 15,12 9,6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernDataTable;