import {Form} from './pages/form/form.jsx';
import Dashboard from './pages/dashboard/dashboard.jsx';
import DoctorLogin from './components/DoctorLogin.jsx';
import MedicalStaffRequest from './components/MedicalStaffRequest.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import LandingPage from './components/LandingPage.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { apiService, mapFormDataToPatient, mapPatientToFormData } from './services/apiService.js';
import { memo, useState, useEffect } from 'react';
import './styles/theme.css';

const App = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [submissions, setSubmissions] = useState([]);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showMedicalRequest, setShowMedicalRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
      // Save current state to localStorage for reload persistence
      localStorage.setItem('currentView', 'dashboard');
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentView('dashboard');
      await loadPatients();
    } else {
      setShowLogin(true);
    }
  };

  const showForm = () => {
    // Clear saved state when going back to form
    localStorage.removeItem('currentView');
    localStorage.removeItem('user');
    setCurrentView('form');
  };

  const showLanding = () => {
    // Clear saved state when going back to landing
    localStorage.removeItem('currentView');
    localStorage.removeItem('user');
    setCurrentView('landing');
  };

  const handlePatientAccess = () => {
    setCurrentView('form');
  };

  const handleLogin = async (userData) => {
    setIsSigningIn(true);
    try {
      // Simulate a brief delay for the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUser(userData);
      setShowLogin(false);
      // Save current state to localStorage for reload persistence
      localStorage.setItem('currentView', 'dashboard');
      localStorage.setItem('user', JSON.stringify(userData));
      setCurrentView('dashboard');
      await loadPatients();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Simulate a brief delay for the loading state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear saved state on logout
      localStorage.removeItem('currentView');
      localStorage.removeItem('user');
      setUser(null);
      setCurrentView('form');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancelLogin = () => {
    setShowLogin(false);
  };

  const handleMedicalStaffRequest = () => {
    setShowLogin(false);
    setShowMedicalRequest(true);
  };

  const handleCancelMedicalRequest = () => {
    setShowMedicalRequest(false);
    setShowLogin(true); // Go back to login
  };

  const handleMedicalRequestSuccess = () => {
    setShowMedicalRequest(false);
    setShowLogin(true); // Go back to login after successful request
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

  // Persist dashboard state on reload
  useEffect(() => {
    // Check if user was on dashboard before reload
    const savedView = localStorage.getItem('currentView');
    const savedUser = localStorage.getItem('user');
    
    if (savedView === 'dashboard' && savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setCurrentView('dashboard');
      loadPatients();
    } else if (savedView === 'form') {
      setCurrentView('form');
    }
    
    // Check if API is available on component mount
    apiService.checkHealth()
      .then(() => {
        console.log('API is available');
      })
      .catch((error) => {
        console.warn('API not available:', error.message);
        setApiError('Database connection unavailable. Please start the backend server.');
      });

    // Listen for medical staff access request events
    const handleRequestMedicalAccess = () => {
      handleMedicalStaffRequest();
    };

    window.addEventListener('requestMedicalAccess', handleRequestMedicalAccess);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('requestMedicalAccess', handleRequestMedicalAccess);
    };
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
        
        {showMedicalRequest && (
          <MedicalStaffRequest
            onCancel={handleCancelMedicalRequest}
            onSuccess={handleMedicalRequestSuccess}
          />
        )}
        
        {currentView === 'landing' ? (
          <LandingPage 
            onPatientAccess={handlePatientAccess}
            onDoctorAccess={showDashboard}
          />
        ) : currentView === 'form' ? (
          <Form 
            onSubmit={handleFormSubmission}
            onDoctorAccess={showDashboard}
            onBackToLanding={showLanding}
            isLoading={isLoading}
          />
        ) : (
          <Dashboard 
            submissions={submissions}
            onBackToForm={showForm}
            onBackToLanding={showLanding}
            onLogout={handleLogout}
            onRefresh={loadPatients}
            onDeletePatient={handleDeletePatient}
            user={user}
            isLoading={isLoading}
          />
        )}
        
        {/* Loading Overlays */}
        <LoadingOverlay 
          isVisible={isSigningIn}
          message="Signing in..."
          icon="🔐"
        />
        <LoadingOverlay 
          isVisible={isLoggingOut}
          message="Logging out..."
          icon="👋"
        />
      </div>
    </ThemeProvider>
  );
};

export default memo(App);
