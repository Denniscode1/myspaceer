const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-railway-app.up.railway.app/api' 
  : 'http://localhost:3001/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  
  return data;
};

// API functions for patient operations
export const apiService = {
  // Get all patients (using reports endpoint)
  async getAllPatients() {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch patient reports:', error);
      throw error;
    }
  },

  // Get patient by ID
  async getPatientById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${id}`);
      return await handleResponse(response);
    } catch (error) {
      console.error(`Failed to fetch patient ${id}:`, error);
      throw error;
    }
  },

  // Create new patient report (enhanced endpoint)
  async createPatient(patientData) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Failed to create patient report:', error);
      throw error;
    }
  },

  // Update patient
  async updatePatient(id, patientData) {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`Failed to update patient ${id}:`, error);
      throw error;
    }
  },

  // Delete patient (doctors and nurses only)
  async deletePatient(id, userRole = 'doctor', userId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_role: userRole,
          user_id: userId
        })
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`Failed to delete patient ${id}:`, error);
      throw error;
    }
  },

  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};

// Helper function to map form data to enhanced report schema
export const mapFormDataToPatient = (formData) => {
  const reportData = {
    name: formData.name.trim(),
    gender: formData.gender,
    age_range: formData.ageRange,
    trn: formData.trn || null,
    incident_type: formData.incident,
    incident_description: formData.incidentDescription || (formData.incident === 'other' ? formData.customIncident : null),
    patient_status: formData.patientStatus,
    transportation_mode: formData.transportationMode,
    // Location data for automatic hospital selection
    latitude: formData.location?.latitude || null,
    longitude: formData.location?.longitude || null,
    location_address: null, // Could be added later with reverse geocoding
    // Contact information for notifications
    contact_email: formData.contactEmail || null,
    contact_phone: formData.contactPhone || null,
    emergency_contact_name: formData.emergencyContact || null,
    emergency_contact_phone: formData.emergencyPhone || null,
    submitted_at: formData.submittedAt || new Date().toISOString()
  };

  console.log('Mapped form data to report schema:', {
    ...reportData,
    hasLocation: !!(reportData.latitude && reportData.longitude)
  });

  return reportData;
};

// Helper function to map enhanced report data back to form format
export const mapPatientToFormData = (report) => {
  return {
    id: report.report_id || report.id,
    name: report.name,
    gender: report.gender,
    ageRange: report.age_range,
    trn: report.trn,
    incident: report.incident_type,
    customIncident: report.incident_type === 'other' ? report.incident_description : '',
    incidentDescription: report.incident_description || '',
    criticality: report.ai_criticality || report.criticality, // From AI or manual triage
    patientStatus: report.patient_status,
    transportationMode: report.transportation_mode,
    location: report.latitude && report.longitude ? {
      latitude: report.latitude,
      longitude: report.longitude
    } : null,
    contactEmail: report.contact_email,
    contactPhone: report.contact_phone,
    emergencyContact: report.emergency_contact_name,
    emergencyPhone: report.emergency_contact_phone,
    submittedAt: report.submitted_at || report.created_at,
    // Additional enhanced fields for dashboard display
    reportId: report.report_id,
    status: report.status,
    hospitalName: report.hospital_name,
    queuePosition: report.queue_position,
    assignedDoctor: report.assigned_doctor_name
  };
};
