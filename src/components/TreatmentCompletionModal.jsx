import React, { useState } from 'react';
import './TreatmentCompletionModal.css';

const TreatmentCompletionModal = ({ 
  patient, 
  isOpen, 
  onClose, 
  onComplete, 
  user 
}) => {
  const [formData, setFormData] = useState({
    treatment_notes: '',
    treatment_outcome: 'successful',
    discharge_status: 'discharged',
    follow_up_required: false,
    follow_up_notes: '',
    patient_satisfaction_rating: 5,
    treatment_started_at: new Date(Date.now() - 30 * 60000).toISOString().slice(0, 16) // 30 minutes ago default
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const completionData = {
        report_id: patient.report_id,
        hospital_id: patient.hospital_id || 'HOSP001', // fallback
        treating_doctor_id: user?.id || 'doctor_unknown',
        treating_doctor_name: user?.username || user?.name || 'Dr. Unknown',
        ...formData
      };

      await onComplete(completionData);
      onClose();
    } catch (error) {
      console.error('Failed to complete treatment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const outcomeOptions = [
    { value: 'successful', label: 'Successful Treatment' },
    { value: 'stable', label: 'Patient Stabilized' },
    { value: 'improved', label: 'Condition Improved' },
    { value: 'transferred', label: 'Transferred to Specialist' },
    { value: 'complications', label: 'Complications Occurred' },
    { value: 'ongoing', label: 'Ongoing Care Required' }
  ];

  const dischargeOptions = [
    { value: 'discharged', label: 'Discharged Home' },
    { value: 'admitted', label: 'Admitted to Hospital' },
    { value: 'transferred', label: 'Transferred to Another Facility' },
    { value: 'self_discharge', label: 'Self-Discharge' },
    { value: 'deceased', label: 'Deceased' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="completion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Complete Treatment</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="patient-summary">
            <h4>Patient: {patient.name}</h4>
            <p><strong>Incident:</strong> {patient.incident_type}</p>
            <p><strong>Criticality:</strong> <span className={`criticality ${patient.criticality}`}>{patient.criticality}</span></p>
            {patient.incident_description && (
              <p><strong>Description:</strong> {patient.incident_description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="completion-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="treatment_started_at">Treatment Started At:</label>
                <input
                  type="datetime-local"
                  id="treatment_started_at"
                  name="treatment_started_at"
                  value={formData.treatment_started_at}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="treatment_outcome">Treatment Outcome:</label>
                <select
                  id="treatment_outcome"
                  name="treatment_outcome"
                  value={formData.treatment_outcome}
                  onChange={handleInputChange}
                  required
                >
                  {outcomeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discharge_status">Discharge Status:</label>
                <select
                  id="discharge_status"
                  name="discharge_status"
                  value={formData.discharge_status}
                  onChange={handleInputChange}
                  required
                >
                  {dischargeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="patient_satisfaction_rating">Patient Satisfaction (1-5):</label>
                <select
                  id="patient_satisfaction_rating"
                  name="patient_satisfaction_rating"
                  value={formData.patient_satisfaction_rating}
                  onChange={handleInputChange}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="treatment_notes">Treatment Notes:</label>
              <textarea
                id="treatment_notes"
                name="treatment_notes"
                value={formData.treatment_notes}
                onChange={handleInputChange}
                rows="4"
                placeholder="Describe the treatment provided, medications administered, procedures performed, etc."
                required
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="follow_up_required"
                  checked={formData.follow_up_required}
                  onChange={handleInputChange}
                />
                <span>Follow-up care required</span>
              </label>
            </div>

            {formData.follow_up_required && (
              <div className="form-group full-width">
                <label htmlFor="follow_up_notes">Follow-up Instructions:</label>
                <textarea
                  id="follow_up_notes"
                  name="follow_up_notes"
                  value={formData.follow_up_notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Specify follow-up care instructions, appointments needed, etc."
                />
              </div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={onClose}
                className="cancel-btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="complete-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Completing...' : 'Complete Treatment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TreatmentCompletionModal;