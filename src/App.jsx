import {Form} from './pages/form/form.jsx';
import Dashboard from './pages/dashboard/dashboard.jsx';
import DoctorLogin from './components/DoctorLogin.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { apiService, mapFormDataToPatient, mapPatientToFormData } from './services/apiService.js';
import { memo, useState, useEffect } from 'react';
import './styles/theme.css';

const App = () => {
  const [currentView, setCurrentView] = useState('form');
  const [submissions, setSubmissions] = useState([]);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleFormSubmission = async (formData) => {
    console.log('Received new submission:', formData);
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Map form data to patient schema and save to database
      const patientData = mapFormDataToPatient(formData);
      const result = await apiService.createPatient(patientData);
      
      console.log('Patient saved to database:', result);
      
      // Refresh the submissions list to include the new patient
      await loadPatients();
    } catch (error) {
      console.error('Failed to save patient:', error);
      setApiError(`Failed to save patient data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.getAllPatients();
      const mappedSubmissions = result.data.map(mapPatientToFormData);
      setSubmissions(mappedSubmissions);
      console.log('Loaded patients from database:', mappedSubmissions.length);
    } catch (error) {
      console.error('Failed to load patients:', error);
      setApiError(`Failed to load patient data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showDashboard = async () => {
    if (user && user.role === 'doctor') {
      setCurrentView('dashboard');
      await loadPatients();
    } else {
      setShowLogin(true);
    }
  };

  const showForm = () => {
    setCurrentView('form');
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    setShowLogin(false);
    setCurrentView('dashboard');
    await loadPatients();
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('form');
  };

  const handleCancelLogin = () => {
    setShowLogin(false);
  };

  const handleDeletePatient = async (patientId) => {
    if (!user || (user.role !== 'doctor' && user.role !== 'nurse')) {
      setApiError('Access denied. Only doctors and nurses can delete patient records.');
      return;
    }

    setIsLoading(true);
    setApiError(null);
    
    try {
      const result = await apiService.deletePatient(patientId, user.role, user.username);
      console.log('Patient deleted successfully:', result);
      
      // Refresh the patients list to reflect the deletion
      await loadPatients();
    } catch (error) {
      console.error('Failed to delete patient:', error);
      setApiError(`Failed to delete patient: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load patients when component mounts (for development/testing)
  useEffect(() => {
    // Check if API is available on component mount
    apiService.checkHealth()
      .then(() => {
        console.log('API is available');
      })
      .catch((error) => {
        console.warn('API not available:', error.message);
        setApiError('Database connection unavailable. Please start the backend server.');
      });
  }, []);

  return (
    <ThemeProvider>
      <div>

        {apiError && (
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid #f5c6cb',
            zIndex: 1000,
            maxWidth: '400px'
          }}>
            <strong>Database Error:</strong> {apiError}
            <button 
              onClick={() => setApiError(null)}
              style={{
                marginLeft: '10px',
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}
        
        {showLogin && (
          <DoctorLogin 
            onLogin={handleLogin}
            onCancel={handleCancelLogin}
          />
        )}
        
        {currentView === 'form' ? (
          <Form 
            onSubmit={handleFormSubmission}
            onDoctorAccess={showDashboard}
            isLoading={isLoading}
          />
        ) : (
          <Dashboard 
            submissions={submissions}
            onBackToForm={showForm}
            onLogout={handleLogout}
            onRefresh={loadPatients}
            onDeletePatient={handleDeletePatient}
            user={user}
            isLoading={isLoading}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default memo(App);
