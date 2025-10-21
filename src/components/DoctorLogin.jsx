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

    // Demo credentials for testing (remove in production)
    const demoCredentials = {
      admin: { password: 'MySpaceER2024!', role: 'doctor' },
      doctor: { password: 'doctor123', role: 'doctor' },
      nurse: { password: 'nurse123', role: 'nurse' }
    };

    try {
      // Check demo credentials first (for testing)
      const demo = demoCredentials[credentials.username.toLowerCase()];
      if (demo && demo.password === credentials.password) {
        // Demo login successful
        onLogin({
          id: 1,
          username: credentials.username,
          role: credentials.role,
          firstName: credentials.username === 'admin' ? 'Demo' : credentials.role.charAt(0).toUpperCase() + credentials.role.slice(1),
          lastName: 'User',
          email: `${credentials.username}@myspaceer.demo`,
          department: credentials.role === 'doctor' ? 'Emergency Medicine' : 'Emergency Nursing',
          loginTime: new Date().toISOString()
        });
        setIsLoading(false);
        return;
      }

      // Try backend validation as fallback
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
        setError('Invalid credentials. Try demo credentials: admin/MySpaceER2024!, doctor/doctor123, or nurse/nurse123');
      }
    } catch (err) {
      // If backend is not available, show demo credentials hint
      setError('Demo credentials: admin/MySpaceER2024!, doctor/doctor123, or nurse/nurse123');
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
          <div className="demo-credentials">
            <p className="access-notice">
              <strong>🧪 Demo Credentials for Testing:</strong>
            </p>
            <div className="demo-creds-list">
              <div><strong>Admin:</strong> admin / MySpaceER2024!</div>
              <div><strong>Doctor:</strong> doctor / doctor123</div>
              <div><strong>Nurse:</strong> nurse / nurse123</div>
            </div>
          </div>
          <hr style={{margin: '15px 0', opacity: 0.3}} />
          <p className="access-notice">
            Need production access?
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