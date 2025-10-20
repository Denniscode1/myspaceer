import React from 'react';
import './ModernDataTable.css';

const ModernDataTable = ({ 
  submissions, 
  allSubmissions,
  onDeletePatient, 
  canDelete, 
  isLoading, 
  onViewDetails, 
  onEditPatient, 
  filters,
  onFilterChange,
  onClearFilters,
  onExport,
  showFilterModal,
  setShowFilterModal,
  searchQuery
}) => {
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

  // Get unique values for filter options
  const getUniqueValues = (key) => {
    if (!allSubmissions) return [];
    const values = allSubmissions.map(s => {
      if (key === 'incident') {
        return s.incident === 'other' ? s.customIncident : s.incident;
      }
      if (key === 'status') {
        return s.patientStatus || 'pending';
      }
      return s[key];
    }).filter((value, index, self) => value && self.indexOf(value) === index);
    return values.sort();
  };

  // Handle filter changes
  const handleFilterUpdate = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    onFilterChange && onFilterChange(newFilters);
  };

  // Count active filters
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== 'all').length;
  };

  if (!submissions || submissions.length === 0) {
    return (
      <div className="modern-table-container">
        <div className="table-header">
          <h2>Patient Records</h2>
          <div className="table-actions">
            <button 
              className="export-btn"
              onClick={() => onExport && onExport('csv')}
              disabled={true}
            >
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
          <button 
            className={`filter-btn ${getActiveFilterCount() > 0 ? 'active' : ''}`}
            onClick={() => setShowFilterModal && setShowFilterModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Filter
            {getActiveFilterCount() > 0 && (
              <span className="filter-badge">{getActiveFilterCount()}</span>
            )}
          </button>
          <button 
            className="export-btn"
            onClick={() => onExport && onExport('csv')}
            disabled={!submissions || submissions.length === 0}
          >
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
          {searchQuery && (
            <span className="search-indicator"> (filtered by: "{searchQuery}")</span>
          )}
          {getActiveFilterCount() > 0 && (
            <span className="filter-indicator"> ({getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} applied)</span>
          )}
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Filter Patients</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowFilterModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="filter-modal-body">
              <div className="filter-grid">
                {/* Criticality Filter */}
                <div className="filter-group">
                  <label>Criticality:</label>
                  <select 
                    value={filters.criticality}
                    onChange={(e) => handleFilterUpdate('criticality', e.target.value)}
                  >
                    <option value="all">All Levels</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="filter-group">
                  <label>Status:</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => handleFilterUpdate('status', e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="waiting">Waiting</option>
                    <option value="in treatment">In Treatment</option>
                    <option value="treated">Treated</option>
                    {getUniqueValues('status').map(status => (
                      !['pending', 'waiting', 'in treatment', 'treated'].includes(status.toLowerCase()) && (
                        <option key={status} value={status}>{status}</option>
                      )
                    ))}
                  </select>
                </div>

                {/* Incident Type Filter */}
                <div className="filter-group">
                  <label>Incident Type:</label>
                  <select 
                    value={filters.incident}
                    onChange={(e) => handleFilterUpdate('incident', e.target.value)}
                  >
                    <option value="all">All Incidents</option>
                    {getUniqueValues('incident').map(incident => (
                      <option key={incident} value={incident}>{incident}</option>
                    ))}
                  </select>
                </div>

                {/* Age Range Filter */}
                <div className="filter-group">
                  <label>Age Range:</label>
                  <select 
                    value={filters.ageRange}
                    onChange={(e) => handleFilterUpdate('ageRange', e.target.value)}
                  >
                    <option value="all">All Ages</option>
                    <option value="0-1">0-1 years</option>
                    <option value="2-12">2-12 years</option>
                    <option value="13-17">13-17 years</option>
                    <option value="18-30">18-30 years</option>
                    <option value="31-50">31-50 years</option>
                    <option value="51-70">51-70 years</option>
                    <option value="70+">70+ years</option>
                  </select>
                </div>

                {/* Transportation Filter */}
                <div className="filter-group">
                  <label>Transportation:</label>
                  <select 
                    value={filters.transportation}
                    onChange={(e) => handleFilterUpdate('transportation', e.target.value)}
                  >
                    <option value="all">All Methods</option>
                    <option value="ambulance">Ambulance</option>
                    <option value="helicopter">Helicopter</option>
                    <option value="private">Private Transport</option>
                    <option value="walk-in">Walk-in</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="filter-group">
                  <label>Date Range:</label>
                  <select 
                    value={filters.dateRange}
                    onChange={(e) => handleFilterUpdate('dateRange', e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="filter-modal-footer">
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  onClearFilters && onClearFilters();
                }}
                disabled={getActiveFilterCount() === 0}
              >
                Clear All Filters
              </button>
              <button 
                className="apply-filters-btn"
                onClick={() => setShowFilterModal(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernDataTable;