import { memo, useState, useCallback, useEffect } from 'react';
import LocationPermission from '../../components/LocationPermission.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { isNewUser } from '../../utils/locationPreferences.js';
import '../../styles/theme.css';
import './Form.css';

const PatientTriageForm = ({ onSubmit, onDoctorAccess, onBackToLanding, isLoading: parentLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    ageRange: '',
    trn: '',
    incident: '',
    customIncident: '',
    incidentDescription: '',
    patientStatus: '',
    transportationMode: '',
    location: null,
    contactEmail: '',
    contactPhone: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);

  // Show location permission request after a short delay
  useEffect(() => {
    if (!locationPermissionAsked && !formData.location) {
      // Only show the popup for new users who haven't set a preference yet
      if (isNewUser()) {
        const timer = setTimeout(() => {
          setShowLocationPermission(true);
        }, 2000); // Show after 2 seconds
        
        return () => clearTimeout(timer);
      }
    }
  }, [locationPermissionAsked, formData.location]);


  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    if (!formData.ageRange) {
      newErrors.ageRange = 'Age range is required';
    }
    
    if (!formData.incident) {
      newErrors.incident = 'Incident type is required';
    }
    
    if (formData.incident === 'other' && !formData.customIncident.trim()) {
      newErrors.customIncident = 'Please describe the incident';
    }
    
    if (!formData.incidentDescription.trim()) {
      newErrors.incidentDescription = 'Detailed incident description is required for AI triage';
    }
    
    if (!formData.patientStatus) {
      newErrors.patientStatus = 'Patient status is required';
    }
    
    if (!formData.transportationMode) {
      newErrors.transportationMode = 'Transportation mode is required';
    }
    
    // Validate contact information
    if (!formData.contactEmail && !formData.contactPhone) {
      newErrors.contactInfo = 'Either email or phone number is required for notifications';
    }
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    
    if (formData.contactPhone && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.contactPhone)) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare submission data
      const submissionData = {
        ...formData,
        id: Date.now() + Math.random(), // Unique ID for each submission
        submittedAt: new Date().toISOString(),
        estimatedTravelTime: formData.location ? 'Calculating...' : 'Unknown'
      };
      
      console.log('Submitting patient data:', submissionData);
      
      // Call parent's submission handler (which now saves to database)
      if (onSubmit) {
        await onSubmit(submissionData);
      }
      
      setIsSubmitted(true);
      
      // Auto-redirect immediately after brief success display
      setTimeout(() => {
        handleReset();
      }, 1500); // Show success for 1.5 seconds then redirect
    } catch (error) {
      console.error('Submission error:', error);
      // Don't set isSubmitted to true if there was an error
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit]);

  const handleReset = useCallback(() => {
    setIsSubmitted(false);
    setFormData({
      name: '',
      gender: '',
      ageRange: '',
      trn: '',
      incident: '',
      customIncident: '',
      incidentDescription: '',
      patientStatus: '',
      transportationMode: '',
      location: formData.location, // Keep location
      contactEmail: '',
      contactPhone: '',
      emergencyContact: '',
      emergencyPhone: ''
    });
    setErrors({});
  }, [formData.location]);

  const handleLocationPermissionResponse = useCallback((response) => {
    setLocationPermissionAsked(true);
    setShowLocationPermission(false);
    
    if (response.granted && response.location) {
      setFormData(prev => ({ ...prev, location: response.location }));
      setLocationError(null);
    } else if (response.error) {
      setLocationError(response.error);
    } else if (response.denied) {
      setLocationError('Location access denied. Travel time estimation will be unavailable.');
    }
  }, []);

  const handleRequestLocationAgain = () => {
    setShowLocationPermission(true);
  };

  if (isSubmitted) {
    return (
      <div className="form-container">
        <div className="form-content">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Submission Successful</h2>
            <p>Your patient information has been successfully submitted to the emergency response system.</p>
            <p>Medical personnel will be notified and will respond according to the priority level.</p>
            <p><strong>🔄 Redirecting to new form...</strong></p>
            {formData.location && (
              <p className="location-info">
                <small>📍 Location captured for response coordination</small>
              </p>
            )}
            <div className="success-buttons">
              <button 
                className="btn btn-primary" 
                onClick={handleReset}
              >
                Submit Another Patient Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-content">
        <div className="form-header">
          <div className="logo-container">
            <div className="logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="16" y="8" width="8" height="24" rx="2" fill="#FF4081"/>
                <rect x="8" y="16" width="24" height="8" rx="2" fill="#FF4081"/>
              </svg>
            </div>
            <div className="brand-info">
              <h1>MYSPACE-ER</h1>
              <p>PATIENT QUEUE MANAGEMENT SYSTEM</p>
            </div>
          </div>
          <div className="header-controls">
            <ThemeToggle size="medium" />
          </div>
          {locationError && (
            <div className="location-warning">
              <small>⚠️ {locationError}</small>
              {locationPermissionAsked && (
                <button 
                  type="button"
                  className="location-retry-btn"
                  onClick={handleRequestLocationAgain}
                  title="Request location access again"
                >
                  📍 Enable Location
                </button>
              )}
            </div>
          )}
        </div>
        
        <form className="patient-form" onSubmit={handleSubmit}>
          <div className="form-three-columns">
            {/* LEFT SECTION */}
            <div className="form-left-section">
              {/* Patient Name */}
              <div className="form-field">
                <label className="field-label required">PATIENT NAME</label>
                <input
                  type="text"
                  className={`field-input ${errors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter patient's full name"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              {/* Age Range */}
              <div className="form-field">
                <label className="field-label required">AGE RANGE</label>
                <select
                  className={`field-input ${errors.ageRange ? 'error' : ''}`}
                  value={formData.ageRange}
                  onChange={(e) => handleInputChange('ageRange', e.target.value)}
                >
                  <option value="">Select age range</option>
                  <option value="0-10">0–10</option>
                  <option value="11-30">11–30</option>
                  <option value="31-50">31–50</option>
                  <option value="51+">51 and over</option>
                </select>
                {errors.ageRange && <span className="error-text">{errors.ageRange}</span>}
              </div>

              {/* TRN */}
              <div className="form-field">
                <label className="field-label">TRN (TAX REGISTRATION NUMBER) <span className="optional-text">Optional</span></label>
                <input
                  type="text"
                  className="field-input"
                  value={formData.trn}
                  onChange={(e) => handleInputChange('trn', e.target.value)}
                  placeholder="Enter TRN if available"
                />
              </div>

              {/* Incident Type */}
              <div className="form-field">
                <label className="field-label required">INCIDENT TYPE</label>
                <select
                  className={`field-input ${errors.incident ? 'error' : ''}`}
                  value={formData.incident}
                  onChange={(e) => handleInputChange('incident', e.target.value)}
                >
                  <option value="">Select incident type</option>
                  <option value="shooting">Shooting</option>
                  <option value="motor-vehicle-accident">Motor vehicle accident</option>
                  <option value="stabbing">Stabbing</option>
                  <option value="other">Other</option>
                </select>
                {errors.incident && <span className="error-text">{errors.incident}</span>}
              </div>

              {/* Gender */}
              <div className="form-field">
                <label className="field-label required">GENDER</label>
                <div className="radio-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                    />
                    <span className="radio-circle"></span>
                    Male
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                    />
                    <span className="radio-circle"></span>
                    Female
                  </label>
                </div>
                {errors.gender && <span className="error-text">{errors.gender}</span>}
              </div>
            </div>

            {/* MIDDLE SECTION */}
            <div className="form-middle-section">
              {/* Custom Incident Description */}
              {formData.incident === 'other' && (
                <div className="form-field">
                  <label className="field-label required">Describe Incident</label>
                  <textarea
                    className={`field-input ${errors.customIncident ? 'error' : ''}`}
                    value={formData.customIncident}
                    onChange={(e) => handleInputChange('customIncident', e.target.value)}
                    placeholder="Please provide details about the incident"
                    rows="3"
                    
                  />
                  {errors.customIncident && <span className="error-text">{errors.customIncident}</span>}
                </div>
              )}

              {/* Detailed Incident Description */}
              <div className="form-field">
                <label className="field-label required">
                  DETAILED INCIDENT DESCRIPTION
                  <span className="ai-note">🤖 AI will analyze this to determine priority</span>
                </label>
                <textarea
                  className={`field-input textarea-extra-large ${errors.incidentDescription ? 'error' : ''}`}
                  value={formData.incidentDescription}
                  onChange={(e) => handleInputChange('incidentDescription', e.target.value)}
                  placeholder="Please provide detailed information about the patient's condition, injuries, symptoms, and any relevant medical history. Include severity indicators like consciousness level, bleeding amount, pain level, breathing difficulty, etc. The AI uses this information to prioritize treatment."
                  rows="8"
                />
                <small className="help-text">
                  💡 <strong>Be specific:</strong> Include symptoms, severity, vital signs, mechanism of injury, current patient state, and any immediate concerns.
                </small>
                {errors.incidentDescription && <span className="error-text">{errors.incidentDescription}</span>}
              </div>

              {/* Patient Status */}
              <div className="form-field">
                <label className="field-label required">PATIENT STATUS</label>
                <div className="radio-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="patientStatus"
                      value="conscious"
                      checked={formData.patientStatus === 'conscious'}
                      onChange={(e) => handleInputChange('patientStatus', e.target.value)}
                    />
                    <span className="radio-circle"></span>
                    Conscious
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="patientStatus"
                      value="unconscious"
                      checked={formData.patientStatus === 'unconscious'}
                      onChange={(e) => handleInputChange('patientStatus', e.target.value)}
                    />
                    <span className="radio-circle"></span>
                    Unconscious
                  </label>
                </div>
                {errors.patientStatus && <span className="error-text">{errors.patientStatus}</span>}
              </div>

              {/* Transportation Mode */}
              <div className="form-field">
                <label className="field-label required">TRANSPORTATION MODE</label>
                <div className="radio-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="transportationMode"
                      value="conscious"
                      checked={formData.transportationMode === 'conscious'}
                      onChange={(e) => handleInputChange('transportationMode', e.target.value)}
                    />
                    <span className="radio-circle"></span>
                    Conscious
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="transportationMode"
                      value="unconscious"
                      checked={formData.transportationMode === 'unconscious'}
                      onChange={(e) => handleInputChange('transportationMode', e.target.value)}
                    />
                    <span className="radio-circle"></span>
                    Unconscious
                  </label>
                </div>
                {errors.transportationMode && <span className="error-text">{errors.transportationMode}</span>}
              </div>
            </div>

            {/* RIGHT SECTION - Contact Information */}
            <div className="form-right-section">
              <div className="contact-info-section">
                <div className="section-header">
                  <span className="phone-icon">📱</span>
                  <h3 className="section-title">CONTACT INFORMATION</h3>
                </div>
                <p className="section-subtitle">We'll send you updates about your queue position and treatment status</p>
                
                {errors.contactInfo && <div className="contact-error">{errors.contactInfo}</div>}
                
                {/* Email */}
                <div className="form-field">
                  <label className="field-label">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    className={`field-input ${errors.contactEmail ? 'error' : ''}`}
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    placeholder="your@email.com"
                  />
                  {errors.contactEmail && <span className="error-text">{errors.contactEmail}</span>}
                </div>

                {/* Phone */}
                <div className="form-field">
                  <label className="field-label">PHONE NUMBER</label>
                  <input
                    type="tel"
                    className={`field-input ${errors.contactPhone ? 'error' : ''}`}
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="+1 (876) 123-4567"
                  />
                  {errors.contactPhone && <span className="error-text">{errors.contactPhone}</span>}
                </div>

                {/* Emergency Contact Name */}
                <div className="form-field">
                  <label className="field-label">EMERGENCY CONTACT NAME <span className="optional-text">Optional</span></label>
                  <input
                    type="text"
                    className="field-input"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>

                {/* Emergency Contact Phone */}
                <div className="form-field">
                  <label className="field-label">EMERGENCY CONTACT PHONE <span className="optional-text">Optional</span></label>
                  <input
                    type="tel"
                    className="field-input"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    placeholder="+1 (876) 123-4567"
                  />
                </div>

                {/* Submit Button */}
                <div className="submit-button-container">
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={isSubmitting || parentLoading}
                  >
                    {(isSubmitting || parentLoading) ? (
                      <>
                        <span className="spinner"></span>
                        {parentLoading ? 'Saving to Database...' : 'Processing...'}
                      </>
                    ) : (
                      'Submit Patient Data'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
      </form>
      
      {/* Footer Navigation */}
      <div className="form-footer">
        {onBackToLanding && (
          <button 
            type="button"
            className="back-to-landing-btn"
            onClick={onBackToLanding}
          >
            ← Back to Home
          </button>
        )}
        {onDoctorAccess && (
          <button 
            type="button"
            className="doctor-access-link"
            onClick={onDoctorAccess}
          >
            Medical Staff Access
          </button>
        )}
      </div>
      </div>
      
      {/* Location Permission Modal */}
      {showLocationPermission && (
        <LocationPermission onPermissionResponse={handleLocationPermissionResponse} />
      )}
    </div>
  );
};

export { PatientTriageForm as Form };
export default memo(PatientTriageForm);
