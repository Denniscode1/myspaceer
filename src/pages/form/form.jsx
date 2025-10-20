import { memo, useState, useCallback, useEffect } from 'react';
import LocationPermission from '../../components/LocationPermission.jsx';
import { isNewUser } from '../../utils/locationPreferences.js';
import './form.css';

const PatientTriageForm = ({ onSubmit, onDoctorAccess, isLoading: parentLoading }) => {
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
          <div className="header-top">
            <div>
              <h1>🤖 AI-Powered Emergency Triage</h1>
              <p>Intelligent patient prioritization and queue management</p>
            </div>
            <div className="header-info">
              <small>Emergency Response System - Patient Registration</small>
            </div>
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
        {/* Name Field */}
        <div className="form-group">
          <label htmlFor="name" className="form-label required">
            Patient Name
          </label>
          <input
            type="text"
            id="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter patient's full name"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        {/* Gender Field */}
        <div className="form-group">
          <fieldset className="form-fieldset">
            <legend className="form-label required">Gender</legend>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                />
                <span className="radio-custom"></span>
                Male
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                />
                <span className="radio-custom"></span>
                Female
              </label>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </fieldset>
        </div>

        {/* Age Range Field */}
        <div className="form-group">
          <label htmlFor="ageRange" className="form-label required">
            Age Range
          </label>
          <select
            id="ageRange"
            className={`form-select ${errors.ageRange ? 'error' : ''}`}
            value={formData.ageRange}
            onChange={(e) => handleInputChange('ageRange', e.target.value)}
          >
            <option value="">Select age range</option>
            <option value="0-10">0–10</option>
            <option value="11-30">11–30</option>
            <option value="31-50">31–50</option>
            <option value="51+">51 and over</option>
          </select>
          {errors.ageRange && <span className="error-message">{errors.ageRange}</span>}
        </div>

        {/* TRN Field */}
        <div className="form-group">
          <label htmlFor="trn" className="form-label">
            TRN (Tax Registration Number)
            <span className="optional">Optional</span>
          </label>
          <input
            type="text"
            id="trn"
            className="form-input"
            value={formData.trn}
            onChange={(e) => handleInputChange('trn', e.target.value)}
            placeholder="Enter TRN if available"
          />
        </div>

        {/* Incident Field */}
        <div className="form-group">
          <label htmlFor="incident" className="form-label required">
            Incident Type
          </label>
          <select
            id="incident"
            className={`form-select ${errors.incident ? 'error' : ''}`}
            value={formData.incident}
            onChange={(e) => handleInputChange('incident', e.target.value)}
          >
            <option value="">Select incident type</option>
            <option value="shooting">Shooting</option>
            <option value="motor-vehicle-accident">Motor vehicle accident</option>
            <option value="stabbing">Stabbing</option>
            <option value="other">Other</option>
          </select>
          {errors.incident && <span className="error-message">{errors.incident}</span>}
        </div>

        {/* Custom Incident Description */}
        {formData.incident === 'other' && (
          <div className="form-group">
            <label htmlFor="customIncident" className="form-label required">
              Describe Incident
            </label>
            <textarea
              id="customIncident"
              className={`form-textarea ${errors.customIncident ? 'error' : ''}`}
              value={formData.customIncident}
              onChange={(e) => handleInputChange('customIncident', e.target.value)}
              placeholder="Please provide details about the incident"
              rows="3"
            />
            {errors.customIncident && <span className="error-message">{errors.customIncident}</span>}
          </div>
        )}

        {/* Incident Description Field - Required for AI Triage */}
        <div className="form-group">
          <label htmlFor="incidentDescription" className="form-label required">
            Detailed Incident Description
            <span className="ai-info">🤖 AI will analyze this to determine priority</span>
          </label>
          <textarea
            id="incidentDescription"
            className={`form-textarea ${errors.incidentDescription ? 'error' : ''}`}
            value={formData.incidentDescription}
            onChange={(e) => handleInputChange('incidentDescription', e.target.value)}
            placeholder="Please provide detailed information about the patient's condition, injuries, symptoms, and any relevant medical history. Include severity indicators like consciousness level, bleeding amount, pain level, breathing difficulty, etc. The AI uses this information to prioritize treatment."
            rows="4"
          />
          <small className="field-help">
            💡 <strong>Be specific:</strong> Include symptoms, severity, vital signs, mechanism of injury, current patient state, and any immediate concerns.
          </small>
          {errors.incidentDescription && <span className="error-message">{errors.incidentDescription}</span>}
        </div>

        {/* Patient Status Field */}
        <div className="form-group">
          <fieldset className="form-fieldset">
            <legend className="form-label required">Patient Status</legend>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="patientStatus"
                  value="conscious"
                  checked={formData.patientStatus === 'conscious'}
                  onChange={(e) => handleInputChange('patientStatus', e.target.value)}
                />
                <span className="radio-custom"></span>
                Conscious
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="patientStatus"
                  value="unconscious"
                  checked={formData.patientStatus === 'unconscious'}
                  onChange={(e) => handleInputChange('patientStatus', e.target.value)}
                />
                <span className="radio-custom"></span>
                Unconscious
              </label>
            </div>
            {errors.patientStatus && <span className="error-message">{errors.patientStatus}</span>}
          </fieldset>
        </div>

        {/* Transportation Mode Field */}
        <div className="form-group">
          <fieldset className="form-fieldset">
            <legend className="form-label required">Transportation Mode</legend>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="transportationMode"
                  value="ambulance"
                  checked={formData.transportationMode === 'ambulance'}
                  onChange={(e) => handleInputChange('transportationMode', e.target.value)}
                />
                <span className="radio-custom"></span>
                Ambulance
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="transportationMode"
                  value="self-carry"
                  checked={formData.transportationMode === 'self-carry'}
                  onChange={(e) => handleInputChange('transportationMode', e.target.value)}
                />
                <span className="radio-custom"></span>
                Self carry
              </label>
            </div>
            {errors.transportationMode && <span className="error-message">{errors.transportationMode}</span>}
          </fieldset>
        </div>

        {/* Contact Information Section */}
        <div className="form-section">
          <h3 className="section-title">📱 Contact Information</h3>
          <p className="section-description">We'll send you updates about your queue position and treatment status</p>
          
          {errors.contactInfo && <div className="error-message section-error">{errors.contactInfo}</div>}
          
          <div className="form-row">
            {/* Email Field */}
            <div className="form-group half-width">
              <label htmlFor="contactEmail" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="contactEmail"
                className={`form-input ${errors.contactEmail ? 'error' : ''}`}
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="your@email.com"
              />
              {errors.contactEmail && <span className="error-message">{errors.contactEmail}</span>}
            </div>

            {/* Phone Field */}
            <div className="form-group half-width">
              <label htmlFor="contactPhone" className="form-label">
                Phone Number
              </label>
              <input
                type="tel"
                id="contactPhone"
                className={`form-input ${errors.contactPhone ? 'error' : ''}`}
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="+1 (876) 123-4567"
              />
              {errors.contactPhone && <span className="error-message">{errors.contactPhone}</span>}
            </div>
          </div>

          <div className="form-row">
            {/* Emergency Contact Name */}
            <div className="form-group half-width">
              <label htmlFor="emergencyContact" className="form-label">
                Emergency Contact Name
                <span className="optional">Optional</span>
              </label>
              <input
                type="text"
                id="emergencyContact"
                className="form-input"
                value={formData.emergencyContact}
                onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                placeholder="Contact person name"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div className="form-group half-width">
              <label htmlFor="emergencyPhone" className="form-label">
                Emergency Contact Phone
                <span className="optional">Optional</span>
              </label>
              <input
                type="tel"
                id="emergencyPhone"
                className="form-input"
                value={formData.emergencyPhone}
                onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                placeholder="+1 (876) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-group">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting || parentLoading}
          >
            {(isSubmitting || parentLoading) ? (
              <>
                <span className="loading-spinner"></span>
                {parentLoading ? 'Saving to Database...' : 'Processing...'}
              </>
            ) : (
              'Submit Patient Data'
            )}
          </button>
        </div>
      </form>
      
      {/* Doctor Access Footer */}
      <div className="form-footer">
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
