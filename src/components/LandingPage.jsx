import React, { useState } from 'react';
import './LandingPage.css';
import logoImage from '/myspace.png';
import headerPic from '../assets/Screenshot 2025-10-21 215140.png'

const LandingPage = ({ onPatientAccess, onDoctorAccess }) => {
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handlePatientAccess = async () => {
    setIsLoadingPatient(true);
    // Wait for button loading animation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start page transition
    setIsTransitioning(true);
    
    // Wait for fade out animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Navigate to next page
    onPatientAccess();
    
    // Reset states
    setIsLoadingPatient(false);
    setIsTransitioning(false);
  };

  const handleDoctorAccess = async () => {
    setIsLoadingStaff(true);
    // Wait for button loading animation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start page transition
    setIsTransitioning(true);
    
    // Wait for fade out animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Navigate to next page
    onDoctorAccess();
    
    // Reset states
    setIsLoadingStaff(false);
    setIsTransitioning(false);
  };
  return (
    <div className={`landing-container ${isTransitioning ? 'transitioning' : ''}`}>
      {/* Transition Overlay */}
      {isTransitioning && (
        <div className="transition-overlay">
          <div className="transition-loader">
            <div className="transition-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <img src={logoImage} alt="MySpaceER" className="brand-logo" />
          </div>
          <div className="nav-links">
            <button 
              className="nav-link" 
              onClick={handlePatientAccess}
              disabled={isLoadingPatient || isLoadingStaff}
            >
              {isLoadingPatient ? (
                <span className="loading-spinner"></span>
              ) : (
                'Patient Portal'
              )}
            </button>
            <button 
              className="nav-link" 
              onClick={handleDoctorAccess}
              disabled={isLoadingPatient || isLoadingStaff}
            >
              {isLoadingStaff ? (
                <span className="loading-spinner"></span>
              ) : (
                'Staff Access'
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <span>MySpaceER</span>
            </div>
            <h1 className="hero-title">
              Intelligent emergency care,<br />
              <span className="hero-highlight">exceptional outcomes</span>
            </h1>
            <p className="hero-description">
              Our team of experienced medical professionals and AI technology 
              are committed to providing you with personalized attention and 
              prioritized emergency care.
            </p>
            <div className="hero-actions">
              <button 
                className="hero-btn primary" 
                onClick={handlePatientAccess}
                disabled={isLoadingPatient || isLoadingStaff}
              >
                {isLoadingPatient ? (
                  <>
                    <span className="loading-spinner"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">▶</span>
                    Start Patient Check-in
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="hero-image">
            <div className="image-placeholder">
              <div className="header-img">
                <img className='pic' src={headerPic} alt="dashboard display" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-number">5+</div>
            <div className="stat-label">Years of excellence</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">98%</div>
            <div className="stat-label">Patient satisfaction rating</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">150K+</div>
            <div className="stat-label">Patients served annually</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Emergency care available</div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="about-content">
          <div className="about-text">
            <div className="section-label">ABOUT THE APP</div>
            <h2 className="section-title">
              MySpaceER is an intelligent<br />
              emergency room triage<br />
              management system
            </h2>
            <p className="section-description">
              Designed to revolutionize emergency healthcare delivery through artificial intelligence. 
              Our platform streamlines patient intake, optimizes queue management, and ensures 
              critical cases receive immediate attention while reducing overall wait times.
            </p>
            <div className="app-features">
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span>AI-powered patient prioritization</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>Real-time queue optimization</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <span>Digital patient check-in system</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="services-content">
          <div className="section-header">
            <div className="section-label">OUR SERVICES</div>
            <h2 className="section-title">For Your Emergency Health</h2>
          </div>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>AI-Powered Triage</h3>
              <p>Intelligent assessment of patient symptoms to automatically determine priority levels and optimize emergency room flow</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="m15 9-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="m9 9 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Real-Time Queue Management</h3>
              <p>Live patient queue tracking with estimated wait times and automatic updates for both patients and medical staff</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="m9 16 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Patient Registration System</h3>
              <p>Streamlined digital check-in process with comprehensive patient information collection and medical history tracking</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Medical Staff Dashboard</h3>
              <p>Comprehensive analytics dashboard for doctors and nurses with patient data, priority sorting, and treatment tracking</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21 8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 8V6a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 6v2z" stroke="currentColor" strokeWidth="2"/>
                  <path d="m3.02 6.65 7.98 4.61 7.98-4.61" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 22V12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Secure Data Management</h3>
              <p>HIPAA-compliant patient data storage with role-based access control and secure information sharing between medical staff</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Communication System</h3>
              <p>Automated notifications and updates to patients about their queue position, estimated wait times, and treatment status</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Experience Better Emergency Care?</h2>
          <p className="cta-description">
            Join thousands of patients who trust MySpaceER for their emergency medical needs.
          </p>
          <div className="cta-buttons">
            <button 
              className="cta-btn primary" 
              onClick={handlePatientAccess}
              disabled={isLoadingPatient || isLoadingStaff}
            >
              {isLoadingPatient ? (
                <>
                  <span className="loading-spinner"></span>
                  Loading...
                </>
              ) : (
                'Start Patient Check-in'
              )}
            </button>
            <button 
              className="cta-btn secondary" 
              onClick={handleDoctorAccess}
              disabled={isLoadingPatient || isLoadingStaff}
            >
              {isLoadingStaff ? (
                <>
                  <span className="loading-spinner"></span>
                  Loading...
                </>
              ) : (
                'Medical Staff Login'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={logoImage} alt="MySpaceER" className="footer-brand-logo" />
            </div>
            <p className="footer-tagline">
              Providing exceptional emergency care through intelligent technology.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-section">
              <h4>Services</h4>
              <ul>
                <li>Emergency Triage</li>
                <li>Patient Monitoring</li>
                <li>Critical Care</li>
                <li>Trauma Treatment</li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Access</h4>
              <ul>
                <li><button onClick={handlePatientAccess} disabled={isLoadingPatient || isLoadingStaff}>Patient Portal</button></li>
                <li><button onClick={handleDoctorAccess} disabled={isLoadingPatient || isLoadingStaff}>Staff Login</button></li>
                <li>Emergency: 911</li>
                <li>Info: (876) 123-4567</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 MySpaceER. All rights reserved. | Emergency Room Triage System</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;