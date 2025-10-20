import { useState, memo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './DoctorLogin.css';

const DoctorLogin = ({ onLogin, onCancel }) => {
  const { theme } = useTheme();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    role: 'doctor'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate credentials with the backend
      const response = await fetch('/api/medical-staff/validate-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          role: credentials.role
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onLogin({
          ...result.user,
          loginTime: new Date().toISOString()
        });
      } else {
        setError(result.message || 'Invalid credentials or access expired.');
      }
    } catch (err) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className={`login-container ${theme}`}>
        <div className="login-header">
          <h2>Medical Staff Login</h2>
          <p>Access to Emergency Response Dashboard</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="role" className="form-label">
              Role
            </label>
            <select
              id="role"
              className="form-input"
              value={credentials.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              disabled={isLoading}
            >
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={credentials.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>

          <div className="login-buttons">
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
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </form>

        <div className="login-info">
          <p className="access-notice">
            Don't have login credentials?
          </p>
          <button 
            type="button" 
            className="request-access-link"
            onClick={() => window.dispatchEvent(new CustomEvent('requestMedicalAccess'))}
          >
            📧 Request Medical Staff Access
          </button>
          <small className="security-note">
            🔒 Secure credentials will be sent to your professional email address
          </small>
        </div>
      </div>
    </div>
  );
};

export default memo(DoctorLogin);