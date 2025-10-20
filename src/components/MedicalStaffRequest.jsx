import { useState, memo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './MedicalStaffRequest.css';

const MedicalStaffRequest = ({ onCancel, onSuccess }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    role: 'doctor',
    firstName: '',
    lastName: '',
    hospitalAffiliation: '',
    medicalLicense: '',
    department: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.hospitalAffiliation.trim()) {
      setError('Hospital affiliation is required');
      return false;
    }
    if (!formData.medicalLicense.trim()) {
      setError('Medical license number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/medical-staff/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Access request submitted successfully! Please check your email for login credentials.');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 3000);
      } else {
        setError(result.message || 'Request failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="request-overlay">
        <div className={`request-container ${theme}`}>
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h2>Request Submitted Successfully!</h2>
            <p>{success}</p>
            <div className="success-details">
              <h4>What happens next:</h4>
              <ul>
                <li>📧 Check your email ({formData.email}) for login credentials</li>
                <li>🔐 Use the provided username and password to access the dashboard</li>
                <li>⚡ Access is typically granted within 5 minutes for verified medical staff</li>
              </ul>
            </div>
            <button 
              className="btn btn-primary"
              onClick={onCancel}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-overlay">
      <div className={`request-container ${theme}`}>
        <div className="request-header">
          <h2>Request Medical Staff Access</h2>
          <p>Please provide your information to receive login credentials via email</p>
        </div>
        
        <form className="request-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label required">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                className="form-input"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label required">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                className="form-input"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label required">
              Professional Email Address
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="doctor@hospital.com"
              disabled={isLoading}
              required
            />
            <small className="help-text">
              Use your official hospital/clinic email address
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label required">
              Role
            </label>
            <select
              id="role"
              className="form-input"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              disabled={isLoading}
            >
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="resident">Resident</option>
              <option value="specialist">Specialist</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hospitalAffiliation" className="form-label required">
              Hospital/Clinic Affiliation
            </label>
            <input
              type="text"
              id="hospitalAffiliation"
              className="form-input"
              value={formData.hospitalAffiliation}
              onChange={(e) => handleInputChange('hospitalAffiliation', e.target.value)}
              placeholder="Kingston Public Hospital"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="department" className="form-label">
              Department
            </label>
            <input
              type="text"
              id="department"
              className="form-input"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              placeholder="Emergency Medicine"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="medicalLicense" className="form-label required">
              Medical License Number
            </label>
            <input
              type="text"
              id="medicalLicense"
              className="form-input"
              value={formData.medicalLicense}
              onChange={(e) => handleInputChange('medicalLicense', e.target.value)}
              placeholder="Enter license number"
              disabled={isLoading}
              required
            />
            <small className="help-text">
              Your medical license will be verified before access is granted
            </small>
          </div>

          <div className="request-buttons">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Submitting Request...
                </>
              ) : (
                'Request Access'
              )}
            </button>
          </div>
        </form>

        <div className="security-notice">
          <small>
            🔒 <strong>Security Notice:</strong> Your information is encrypted and will only be used for verification purposes. 
            Login credentials will be sent to your provided email address.
          </small>
        </div>
      </div>
    </div>
  );
};

export default memo(MedicalStaffRequest);