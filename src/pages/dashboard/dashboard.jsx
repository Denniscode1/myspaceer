import React, { useState } from 'react';
import './dashboard.css';
import ModernSidebar from '../../components/ModernSidebar.jsx';
import ModernHeader from '../../components/ModernHeader.jsx';
import ModernDataTable from '../../components/ModernDataTable.jsx';
import ModernStatsCards from '../../components/ModernStatsCards.jsx';
import QueueManagement from '../../components/QueueManagement.jsx';
import TreatedSection from '../../components/TreatedSection.jsx';
import { getLocationDisplayPreference, LocationDisplayFormat } from '../../utils/locationPreferences.js';

const Dashboard = ({ submissions, onBackToForm, onLogout, onRefresh, user, isLoading, onDeletePatient }) => {
  const [activeTab, setActiveTab] = useState('patients');
  const [notifications, setNotifications] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    criticality: 'all',
    status: 'all',
    incident: 'all',
    ageRange: 'all',
    transportation: 'all',
    dateRange: 'all'
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

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
    if (!location || !location.latitude || !location.longitude) {
      return 'Unknown';
    }

    const displayPreference = getLocationDisplayPreference();
    const coordinates = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    
    switch (displayPreference) {
      case LocationDisplayFormat.COORDINATES:
        return coordinates;
      case LocationDisplayFormat.PLACE_NAME:
        return location.placeName || location.shortPlaceName || coordinates;
      case LocationDisplayFormat.AUTO:
      default:
        // Use place name if available, otherwise coordinates
        return location.placeName || location.shortPlaceName || coordinates;
    }
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close sidebar on mobile after tab selection
  };

  const handleDeletePatientClick = (submission) => {
    handleDeleteClick(submission);
  };

  const handleViewDetails = (submission) => {
    setSelectedPatient(submission);
    setShowDetailsModal(true);
  };

  const handleEditPatient = (submission) => {
    setSelectedPatient(submission);
    setShowEditModal(true);
  };

  const closeModals = () => {
    setSelectedPatient(null);
    setShowDetailsModal(false);
    setShowEditModal(false);
  };

  // Search and filter functions
  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      criticality: 'all',
      status: 'all',
      incident: 'all',
      ageRange: 'all',
      transportation: 'all',
      dateRange: 'all'
    });
  };

  // Filter and search submissions
  const getFilteredSubmissions = () => {
    if (!submissions) return [];

    let filtered = [...submissions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(submission => 
        submission.name.toLowerCase().includes(query) ||
        (submission.trn && submission.trn.toLowerCase().includes(query)) ||
        submission.incident.toLowerCase().includes(query) ||
        (submission.customIncident && submission.customIncident.toLowerCase().includes(query)) ||
        submission.criticality.toLowerCase().includes(query) ||
        submission.transportationMode.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filters.criticality !== 'all') {
      filtered = filtered.filter(s => s.criticality === filters.criticality);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(s => (s.patientStatus || 'pending').toLowerCase() === filters.status.toLowerCase());
    }

    if (filters.incident !== 'all') {
      filtered = filtered.filter(s => s.incident === filters.incident);
    }

    if (filters.ageRange !== 'all') {
      filtered = filtered.filter(s => s.ageRange === filters.ageRange);
    }

    if (filters.transportation !== 'all') {
      filtered = filtered.filter(s => s.transportationMode === filters.transportation);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(s => new Date(s.submittedAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(s => new Date(s.submittedAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(s => new Date(s.submittedAt) >= filterDate);
          break;
      }
    }

    return filtered;
  };

  // Export function
  const handleExport = (format = 'csv') => {
    const filteredData = getFilteredSubmissions();
    
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Patient Name',
      'TRN',
      'Age Range',
      'Gender',
      'Incident Type',
      'Criticality',
      'Status',
      'Transportation',
      'Contact Number',
      'Location',
      'Medical History',
      'Additional Notes',
      'Submitted At'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(submission => [
        `"${submission.name}"`,
        `"${submission.trn || 'N/A'}"`,
        `"${submission.ageRange}"`,
        `"${submission.gender}"`,
        `"${submission.incident === 'other' ? submission.customIncident : submission.incident}"`,
        `"${submission.criticality}"`,
        `"${submission.patientStatus || 'Pending'}"`,
        `"${submission.transportationMode}"`,
        `"${submission.contactNumber || 'N/A'}"`,
        `"${formatLocation(submission.location)}"`,
        `"${(submission.medicalHistory || '').replace(/"/g, '""')}"`,
        `"${(submission.additionalNotes || '').replace(/"/g, '""')}"`,
        `"${formatDate(submission.submittedAt)}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `patient_records_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  console.log('Dashboard rendering with modern layout!');
  
  return (
    <div className="modern-dashboard">
      {/* Patient Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content patient-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Patient Details</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Patient Name:</label>
                  <span>{selectedPatient.name}</span>
                </div>
                <div className="detail-item">
                  <label>TRN:</label>
                  <span>{selectedPatient.trn || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Age Range:</label>
                  <span>{selectedPatient.ageRange}</span>
                </div>
                <div className="detail-item">
                  <label>Gender:</label>
                  <span>{selectedPatient.gender}</span>
                </div>
                <div className="detail-item">
                  <label>Incident Type:</label>
                  <span>{selectedPatient.incident === 'other' ? selectedPatient.customIncident : selectedPatient.incident}</span>
                </div>
                <div className="detail-item">
                  <label>Criticality:</label>
                  <span 
                    className="criticality-badge"
                    style={{ backgroundColor: getCriticalityColor(selectedPatient.criticality), color: 'white', padding: '4px 8px', borderRadius: '4px' }}
                  >
                    {selectedPatient.criticality}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Transportation:</label>
                  <span>{selectedPatient.transportationMode}</span>
                </div>
                <div className="detail-item">
                  <label>Location:</label>
                  <span>{formatLocation(selectedPatient.location)}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span>{selectedPatient.patientStatus || 'Pending'}</span>
                </div>
                <div className="detail-item">
                  <label>Submitted:</label>
                  <span>{formatDate(selectedPatient.submittedAt)}</span>
                </div>
                {selectedPatient.contactNumber && (
                  <div className="detail-item">
                    <label>Contact Number:</label>
                    <span>{selectedPatient.contactNumber}</span>
                  </div>
                )}
                {selectedPatient.medicalHistory && (
                  <div className="detail-item full-width">
                    <label>Medical History:</label>
                    <div className="notes-content">
                      {selectedPatient.medicalHistory}
                    </div>
                  </div>
                )}
                {selectedPatient.additionalNotes && (
                  <div className="detail-item full-width">
                    <label>Additional Notes:</label>
                    <div className="notes-content">
                      {selectedPatient.additionalNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Edit Modal */}
      {showEditModal && selectedPatient && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content patient-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Patient</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <div className="modal-body">
              <form className="edit-form">
                <div className="form-group">
                  <label>Patient Name:</label>
                  <input 
                    type="text" 
                    defaultValue={selectedPatient.name}
                    placeholder="Enter patient name"
                  />
                </div>
                <div className="form-group">
                  <label>TRN:</label>
                  <input 
                    type="text" 
                    defaultValue={selectedPatient.trn || ''}
                    placeholder="Enter TRN"
                  />
                </div>
                <div className="form-group">
                  <label>Age Range:</label>
                  <select defaultValue={selectedPatient.ageRange}>
                    <option value="0-1">0-1 years</option>
                    <option value="2-12">2-12 years</option>
                    <option value="13-17">13-17 years</option>
                    <option value="18-30">18-30 years</option>
                    <option value="31-50">31-50 years</option>
                    <option value="51-70">51-70 years</option>
                    <option value="70+">70+ years</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gender:</label>
                  <select defaultValue={selectedPatient.gender}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Criticality:</label>
                  <select defaultValue={selectedPatient.criticality}>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Transportation:</label>
                  <select defaultValue={selectedPatient.transportationMode}>
                    <option value="ambulance">Ambulance</option>
                    <option value="helicopter">Helicopter</option>
                    <option value="private">Private Transport</option>
                    <option value="walk-in">Walk-in</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact Number:</label>
                  <input 
                    type="tel" 
                    defaultValue={selectedPatient.contactNumber || ''}
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="form-group">
                  <label>Medical History:</label>
                  <textarea 
                    rows="3"
                    defaultValue={selectedPatient.medicalHistory || ''}
                    placeholder="Enter medical history"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Additional Notes:</label>
                  <textarea 
                    rows="3"
                    defaultValue={selectedPatient.additionalNotes || ''}
                    placeholder="Enter additional notes"
                  ></textarea>
                </div>
              </form>
            </div>
            
            <div className="modal-footer">
              <button className="cancel-button" onClick={closeModals}>Cancel</button>
              <button className="save-button" onClick={() => {
                // TODO: Implement save functionality
                console.log('Save patient changes');
                closeModals();
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Sidebar */}
      <ModernSidebar 
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        onBackToForm={onBackToForm}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay show" onClick={toggleSidebar}></div>}

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <ModernHeader 
          user={user}
          onRefresh={onRefresh}
          isLoading={isLoading}
          notifications={notifications}
          onToggleSidebar={toggleSidebar}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'patients' && (
            <>
              <ModernStatsCards submissions={submissions} />
              <ModernDataTable 
                submissions={getFilteredSubmissions()}
                allSubmissions={submissions}
                onDeletePatient={handleDeletePatientClick}
                onViewDetails={handleViewDetails}
                onEditPatient={handleEditPatient}
                canDelete={canDelete}
                isLoading={isLoading}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                onExport={handleExport}
                showFilterModal={showFilterModal}
                setShowFilterModal={setShowFilterModal}
                searchQuery={searchQuery}
              />
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
    </div>
  );
};

export default Dashboard;