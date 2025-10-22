import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Security middleware
import {
  basicSecurity,
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  sanitizeInput,
  securityLogger,
  secureErrorHandler,
  validatePatientData,
  handleValidationErrors
} from './middleware/security.js';

// Enhanced database operations
import {
  initializeEnhancedDatabase,
  seedDefaultData,
  createPatientReport,
  getPatientReports,
  updateReportStatus,
  assignHospital,
  addToQueue,
  logEvent,
  saveTravelEstimate,
  getTravelEstimate,
  createTreatedPatient,
  getTreatedPatients,
  updateTreatedPatient,
  getTreatedPatientStats,
  deletePatientReport
} from './database-enhanced.js';

// Services
import { performTriage } from './services/triageEngine.js';
import { selectHospital } from './services/travelTimeService.js';
import { getHospitalQueue, removeFromQueue } from './services/queueManager.js';
import { queueNotification, notificationService } from './services/notificationService.js';
import { selectNearestHospital } from './services/hospitalSelector.js';
import {
  notifyPatientQueueUpdate,
  notifyPatientStatusUpdate,
  notifyDoctorAssignment,
  notifyTreatmentReady,
  notifyPatientArrived,
  notifyTreatmentStarted,
  notifyTreatmentCompleted
} from './services/patientNotificationService.js';
import {
  notifySubmitterQueueUpdate,
  notifySubmitterStatusUpdate,
  notifySubmitterTreatmentReady
} from './services/submitterNotificationService.js';
import {
  assignDoctorToPatient,
  releaseDoctorFromPatient,
  getAssignmentStats,
  getAvailableSpecialties
} from './services/doctorAssignmentService.js';
import { medicalStaffService } from './services/medicalStaffService.js';
import { getHospitals } from './database-enhanced.js';

// Helper function to get patient contact info
const getPatientContact = async (reportId) => {
  return notificationService.getPatientContact(reportId);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev server
    'https://denniscode1.github.io', // GitHub Pages
    'https://myspaceer-production.up.railway.app', // Explicit Railway URL
    process.env.FRONTEND_URL, // Railway/production frontend
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
    'https://*.railway.app', // Railway wildcard
    'https://*.up.railway.app' // Railway app domains
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || 
      (origin && (origin.includes('railway.app') || origin.includes('up.railway.app')))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Apply security middleware first
app.use(basicSecurity);
app.use(generalRateLimit);
app.use(securityLogger);
app.use(sanitizeInput);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rate limiting middleware (simple implementation)
const requestCounts = new Map();
const rateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // Max requests per window

  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, []);
  }

  const requests = requestCounts.get(clientIP);
  // Remove requests outside the window
  const validRequests = requests.filter(time => now - time < windowMs);
  requestCounts.set(clientIP, validRequests);

  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retry_after: Math.ceil(windowMs / 1000)
    });
  }

  validRequests.push(now);
  next();
};

// Apply enhanced rate limiting to sensitive endpoints
app.use('/api/medical-staff', authRateLimit);
app.use('/api/reports', apiRateLimit);

// Initialize enhanced database on server start
initializeEnhancedDatabase()
  .then(() => {
    console.log('Enhanced database initialized');
    return seedDefaultData();
  })
  .then(() => {
    console.log('Default data seeded');
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

// ====================
// EMERGENCY TRIAGE API ENDPOINTS
// ====================

/**
 * POST /api/reports - Submit new patient report (Field Submission)
 * This is the main entry point for EMT or app submissions
 */
app.post('/api/reports', validatePatientData, handleValidationErrors, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const reportData = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'gender', 'age_range', 'incident_type', 'patient_status', 'transportation_mode'];
    const missingFields = requiredFields.filter(field => !reportData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing_fields: missingFields
      });
    }

    // Step 1: Create patient report with immediate response
    const patientReport = await createPatientReport({
      ...reportData,
      submitted_at: new Date().toISOString()
    });

    console.log(`Patient report created: ${patientReport.report_id}`);

    // Step 2: Return immediate acknowledgment (as per requirements)
    res.status(201).json({
      success: true,
      report_id: patientReport.report_id,
      message: 'Report submitted successfully',
      processing_started: true,
      submitted_at: patientReport.submitted_at
    });

    // Step 3: Start asynchronous processing pipeline
    setImmediate(() => processReportAsync(patientReport));

  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report',
      details: error.message
    });
  }
});

/**
 * Asynchronous report processing pipeline
 * Handles triage, hospital selection, and queue management
 */
async function processReportAsync(patientReport) {
  try {
    console.log(`Starting async processing for report: ${patientReport.report_id}`);
    
    // Step 1: Perform triage analysis
    await updateReportStatus(patientReport.report_id, 'Processing');
    
    const triageResult = await performTriage({
      ...patientReport,
      incident_type: patientReport.incident_type,
      patient_status: patientReport.patient_status,
      age_range: patientReport.age_range,
      transportation_mode: patientReport.transportation_mode,
      incident_description: patientReport.incident_description
    });

    console.log(`Triage completed for ${patientReport.report_id}: ${triageResult.criticality}`);

    // Step 2: Hospital selection using enhanced Jamaica-specific algorithm
    let hospitalSelection;
    if (patientReport.latitude && patientReport.longitude) {
      // Use Jamaica-specific selector with full context object
      hospitalSelection = await selectNearestHospital({
        report_id: patientReport.report_id,
        latitude: patientReport.latitude,
        longitude: patientReport.longitude,
        criticality: triageResult.criticality,
        incident_type: patientReport.incident_type,
        age_range: patientReport.age_range,
        transportation_mode: patientReport.transportation_mode
      });
      const sel = hospitalSelection.selected_hospital;
      console.log(`Hospital selected for ${patientReport.report_id}: ${sel?.name || sel?.hospital_name || 'unknown'}`);
    } else {
      // Fallback when no coordinates are provided
      hospitalSelection = await selectHospital({
        report_id: patientReport.report_id,
        latitude: patientReport.latitude,
        longitude: patientReport.longitude,
        criticality: triageResult.criticality
      });
      console.log(`Hospital selected (fallback) for ${patientReport.report_id}`);
    }

    if (hospitalSelection) {
      const selectedHospital = hospitalSelection.hospital || hospitalSelection.selected_hospital;
      
      // Step 3: Save travel estimate data
      try {
        // Normalize travel time: selector returns minutes; route_info returns seconds
        let travelTime = hospitalSelection.travelTime || (hospitalSelection.selected_hospital?.travelTime);
        if (travelTime && travelTime < 1000) {
          travelTime = travelTime * 60; // convert minutes -> seconds
        }
        travelTime = travelTime || (hospitalSelection.selected_hospital?.route_info?.duration_seconds) || 900; // default 15m in seconds
        const distance = hospitalSelection.distance || 
          (hospitalSelection.selected_hospital?.route_info?.distance_meters) || 10000; // 10km default
        const trafficFactor = hospitalSelection.trafficFactor || 
          (hospitalSelection.selected_hospital?.route_info?.traffic_factor) || 1.2;
        
        await saveTravelEstimate(
          patientReport.report_id,
          selectedHospital.hospital_id || selectedHospital.id,
          travelTime,
          distance,
          trafficFactor,
          'jamaica_selector'
        );
        console.log(`Travel estimate saved for ${patientReport.report_id}`);
      } catch (travelSaveError) {
        console.warn(`Failed to save travel estimate for ${patientReport.report_id}:`, travelSaveError);
      }
      
      // Step 4: Assign hospital
      await assignHospital(
        patientReport.report_id,
        selectedHospital.hospital_id || selectedHospital.id,
        selectedHospital.total_score || hospitalSelection.total_score || 0,
        selectedHospital.name || selectedHospital.hospital_name
      );

      // Step 5: Add to hospital queue
      let travelTime = hospitalSelection.travelTime || (hospitalSelection.selected_hospital?.travelTime);
      if (travelTime && travelTime < 1000) travelTime = travelTime * 60; // minutes -> seconds
      travelTime = travelTime || (hospitalSelection.selected_hospital?.route_info?.duration_seconds) || 900; // default 15m sec
      const priorityScore = calculatePriorityScore({
        criticality: triageResult.criticality,
        travelTimeSeconds: travelTime,
        report: patientReport
      });
      
      // Step 5: Add to hospital queue with error handling
      let queueResult;
      try {
        console.log(`Adding ${patientReport.report_id} to queue with priority ${priorityScore}`);
        queueResult = await addToQueue(
          patientReport.report_id,
          selectedHospital.hospital_id || selectedHospital.id,
          priorityScore
        );
        console.log(`✅ Patient added to queue: position ${queueResult?.position || queueResult?.queue_position || 'unknown'}`);
      } catch (queueError) {
        console.error(`❌ Failed to add ${patientReport.report_id} to queue:`, queueError);
        // Continue processing even if queue addition fails
        queueResult = { position: 1, queue_position: 1, estimated_wait_time: 1800 };
      }

      // Step 6: Assign doctor to patient (non-blocking)
      let doctorAssignment = { success: false, error: 'Not attempted' };
      try {
        console.log(`Attempting doctor assignment for ${patientReport.report_id}`);
        const assignment = await Promise.race([
          assignDoctorToPatient(
            patientReport.report_id,
            selectedHospital.hospital_id || selectedHospital.id,
            patientReport.incident_type,
            triageResult.criticality,
            patientReport.age_range
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Doctor assignment timeout')), 5000)
          )
        ]);
        
        doctorAssignment = assignment;
        
        if (assignment.success) {
          console.log(`✅ Doctor assigned to ${patientReport.report_id}: ${assignment.assigned_doctor.name}`);
        } else {
          console.log(`⚠️ No doctor available for ${patientReport.report_id}: ${assignment.error}`);
        }
      } catch (doctorAssignError) {
        console.warn(`⚠️ Doctor assignment failed for ${patientReport.report_id}:`, doctorAssignError.message);
        // Continue without doctor assignment
      }

      // Step 7: Update status to Assigned
      try {
        await updateReportStatus(patientReport.report_id, 'Assigned');
        console.log(`✅ Status updated to Assigned for ${patientReport.report_id}`);
      } catch (statusError) {
        console.error(`❌ Failed to update status for ${patientReport.report_id}:`, statusError);
      }

      // Step 8: Send patient notifications (non-blocking)
      try {
        const queuePosition = queueResult?.queue_position ?? queueResult?.position ?? 1;
        const estimatedWaitTime = Number.isFinite(queuePosition) ? queuePosition * 30 * 60 : 30 * 60; // default 30m
        
        console.log(`Sending notifications for ${patientReport.report_id}: position ${queuePosition}, wait ${Math.round(estimatedWaitTime/60)}min`);
        
        const queueData = {
          hospital_name: selectedHospital.name || selectedHospital.hospital_name,
          queue_position: queuePosition,
          estimated_wait_time: estimatedWaitTime
        };
        
        // Use timeout to prevent hanging
        await Promise.race([
          notifyPatientQueueUpdate(patientReport.report_id, queueData),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Notification timeout')), 3000)
          )
        ]);
        
        console.log(`✅ Patient notifications sent for ${patientReport.report_id}`);
      } catch (notificationError) {
        console.warn(`⚠️ Patient notification failed for ${patientReport.report_id}:`, notificationError.message);
        // Continue - notifications are not critical for core functionality
      }
      
    } else {
      console.log(`No hospital selection result for ${patientReport.report_id}`);
      await updateReportStatus(patientReport.report_id, 'TriageComplete');
    }

    console.log(`Async processing completed for report: ${patientReport.report_id}`);

  } catch (error) {
    console.error(`Async processing failed for ${patientReport.report_id}:`, error);
    await updateReportStatus(patientReport.report_id, 'ProcessingError');
  }
}

/**
 * Calculate priority score for queue positioning
 */
function calculatePriorityScore({ criticality, travelTimeSeconds, report }) {
  // Base on AI-like heuristics so all patients enter the queue, but ordering reflects urgency
  const criticalityScores = {
    severe: 10,
    high: 7,
    moderate: 4,
    low: 2
  };

  const statusBoosts = {
    unconscious: 4,
    bleeding: 3,
    difficulty_breathing: 4,
    chest_pain: 4,
    fracture: 1
  };

  const incidentBoosts = {
    shooting: 5,
    stabbing: 5,
    burn: 3,
    "motor-vehicle-accident": 3,
    fall: 1
  };

  const ageBoost = (() => {
    const age = (report?.age_range || '').toLowerCase();
    if (age.includes('0-5') || age.includes('0-4') || age.includes('0-')) return 2; // very young
    if (age.includes('65') || age.includes('66') || age.includes('51+')) return 2; // elderly
    return 0;
  })();

  const transportBoost = (report?.transportation_mode === 'ambulance') ? 2 : 0;

  const statusKey = (report?.patient_status || '').toLowerCase().replace(/\s+/g, '_');
  const statusScore = statusBoosts[statusKey] || 0;
  const incidentKey = (report?.incident_type || '').toLowerCase();
  const incidentScore = incidentBoosts[incidentKey] || 0;

  const baseCrit = criticalityScores[criticality] ?? 4;

  // Travel time urgency: closer patients can be seen sooner; cap between 0.5 and 5
  const timeUrgency = Math.min(5, Math.max(0.5, 6 - (Number(travelTimeSeconds || 0) / 600)));

  // Recent submissions get a tiny fairness nudge to avoid starvation
  const recentNudge = 0.25;

  // Small tie-breaker randomness to prevent identical scores from clumping
  const epsilon = Math.random() * 0.1;

  return baseCrit + statusScore + incidentScore + ageBoost + transportBoost + timeUrgency + recentNudge + epsilon;
}

/**
 * GET /api/reports - Get all patient reports with triage and assignment info
 */
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await getPatientReports();
    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports'
    });
  }
});

/**
 * GET /api/reports/:reportId - Get specific report details
 */
app.get('/api/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const reports = await getPatientReports({ report_id: reportId });
    
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: reports[0]
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

/**
 * PATCH /api/reports/:reportId/status - Update report status
 */
app.patch('/api/reports/:reportId/status', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, user_id, user_role } = req.body;
    
    const validStatuses = ['Created', 'Processing', 'TriageComplete', 'Assigned', 'Arrived', 'InTreatment', 'Completed', 'ProcessingError'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    const result = await updateReportStatus(reportId, status, user_id);
    
    // Send patient notification when status is updated by doctor/nurse
    if (user_role === 'doctor' || user_role === 'nurse') {
      try {
        // Get current report details for assigned doctor info and queue data
        const reports = await getPatientReports({ report_id: reportId });
        const assignedDoctor = reports[0]?.assigned_doctor_name || user_id || 'Medical Staff';
        const hospitalId = reports[0]?.hospital_id;
        
        // Send specific notifications based on status
        switch (status) {
          case 'Arrived':
            // Get queue data for arrival notification
            if (hospitalId) {
              const queueData = await getHospitalQueue(hospitalId);
              const patientQueue = queueData.queue_items?.find(p => p.report_id === reportId);
              
              if (patientQueue) {
                await notifyPatientArrived(reportId, {
                  hospital_name: queueData.hospital_name || reports[0]?.hospital_name,
                  queue_position: patientQueue.queue_position,
                  estimated_wait_time: patientQueue.estimated_wait_time
                });
                console.log(`Patient arrival notification sent: ${reportId}`);
              }
            }
            break;
            
          case 'InTreatment':
            // Send treatment started notification
            await notifyTreatmentStarted(reportId, assignedDoctor, new Date().toISOString());
            console.log(`Treatment started notification sent: ${reportId}`);
            break;
            
          case 'Completed':
            // Treatment completed notification will be handled by the complete-treatment endpoint
            // for detailed treatment information
            break;
            
          default:
            // Send general status update notifications to both patient and submitter
            await notifyPatientStatusUpdate(reportId, status, assignedDoctor);
            await notifySubmitterStatusUpdate(reportId, status, assignedDoctor);
            console.log(`Patient and submitter status update notifications sent: ${reportId} -> ${status}`);
            break;
        }
      } catch (notificationError) {
        console.warn(`Failed to notify patient of status update for ${reportId}:`, notificationError);
      }
    }
    
    res.json({
      success: true,
      data: result,
      message: `Status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

/**
 * DELETE /api/reports/:reportId - Delete patient report (doctors and nurses only)
 */
app.delete('/api/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { user_id, user_role } = req.body;
    
    // Role-based authorization - only doctors and nurses can delete patients
    if (!user_role || (user_role !== 'doctor' && user_role !== 'nurse')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only doctors and nurses can delete patient records.',
        required_roles: ['doctor', 'nurse']
      });
    }

    // Check if patient report exists
    const reports = await getPatientReports({ report_id: reportId });
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient report not found'
      });
    }

    const patientReport = reports[0];

    // Delete from all related tables in the correct order
    await deletePatientReport(reportId, user_id, user_role);
    
    // Log the deletion event
    await logEvent('patient_deleted', 'patient_report', reportId, user_id, user_role, {
      deleted_patient: {
        name: patientReport.name,
        incident_type: patientReport.incident_type,
        status: patientReport.status,
        hospital_name: patientReport.hospital_name
      }
    });

    res.json({
      success: true,
      message: 'Patient record deleted successfully',
      deleted_report: {
        report_id: reportId,
        patient_name: patientReport.name,
        deleted_by: user_id,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error deleting patient report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete patient record',
      details: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/location - Update live location for travel time estimation
 */
app.post('/api/reports/:reportId/location', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { latitude, longitude, speed } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    // Log location update
    await logEvent('location_updated', 'patient_report', reportId, null, null, {
      latitude,
      longitude,
      speed: speed || 0,
      timestamp: new Date().toISOString()
    });

    // In production, this would trigger ETA recalculation
    console.log(`Location updated for ${reportId}: ${latitude}, ${longitude}`);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location'
    });
  }
});

/**
 * GET /api/reports/:reportId/travel-time - Get travel time estimates for a report
 */
app.get('/api/reports/:reportId/travel-time', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { hospitalId } = req.query;
    
    const travelEstimate = await getTravelEstimate(reportId, hospitalId);
    
    if (!travelEstimate) {
      return res.status(404).json({
        success: false,
        error: 'No travel time data found for this report'
      });
    }
    
    // Format the response with computed fields
    const response = {
      ...travelEstimate,
      travel_time_minutes: Math.round(travelEstimate.estimated_time_seconds / 60),
      travel_distance_km: Math.round((travelEstimate.distance_meters / 1000) * 10) / 10,
      formatted_time: formatTravelTime(travelEstimate.estimated_time_seconds),
      eta: new Date(Date.now() + (travelEstimate.estimated_time_seconds * 1000)).toISOString()
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching travel time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch travel time data'
    });
  }
});

// Helper function to format travel time
function formatTravelTime(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

// ====================
// LEGACY API ENDPOINTS (for backward compatibility)
// ====================

/**
 * Legacy patient endpoints - maps to new report system
 */
app.get('/api/patients', async (req, res) => {
  try {
    const reports = await getPatientReports();
    
    // Transform reports to legacy patient format
    const patients = reports.map(report => ({
      id: report.id,
      firstName: report.name.split(' ')[0] || '',
      lastName: report.name.split(' ').slice(1).join(' ') || '',
      gender: report.gender,
      ageRange: report.age_range,
      trn: report.trn,
      incident: report.incident_type,
      customIncident: report.incident_description,
      triageLevel: report.criticality || 'pending',
      patientStatus: report.patient_status,
      transportationMode: report.transportation_mode,
      submittedAt: report.submitted_at,
      createdAt: report.created_at,
      // Additional fields from new system
      reportId: report.report_id,
      status: report.status,
      hospitalName: report.hospital_name,
      queuePosition: report.queue_position
    }));

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Error fetching patients (legacy):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients'
    });
  }
});

/**
 * POST /api/patients - Legacy endpoint for patient creation
 */
app.post('/api/patients', async (req, res) => {
  try {
    const patientData = req.body;
    
    // Transform legacy format to new report format
    const reportData = {
      name: `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim(),
      gender: patientData.gender,
      age_range: patientData.ageRange,
      trn: patientData.trn,
      incident_type: patientData.incident,
      incident_description: patientData.customIncident,
      patient_status: patientData.patientStatus,
      transportation_mode: patientData.transportationMode,
      latitude: null,
      longitude: null,
      location_address: null
    };

    // Use the new report creation process
    const patientReport = await createPatientReport(reportData);
    
    // Start async processing
    setImmediate(() => processReportAsync(patientReport));

    res.status(201).json({
      success: true,
      data: {
        id: patientReport.id,
        reportId: patientReport.report_id,
        ...patientData
      }
    });
  } catch (error) {
    console.error('Error creating patient (legacy):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create patient'
    });
  }
});

/**
 * DELETE /api/patients/:id - Legacy endpoint for patient deletion
 */
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role } = req.body;
    
    // Role-based authorization - only doctors and nurses can delete patients
    if (!user_role || (user_role !== 'doctor' && user_role !== 'nurse')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only doctors and nurses can delete patient records.',
        required_roles: ['doctor', 'nurse']
      });
    }

    // Find the report by legacy ID or report_id
    let reports;
    // First try to find by report_id (if id looks like a report ID)
    if (id.startsWith('RPT_')) {
      reports = await getPatientReports({ report_id: id });
    } else {
      // Otherwise try to find by database ID
      reports = await getPatientReports();
      reports = reports.filter(r => r.id == id);
    }

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    const patientReport = reports[0];
    const reportId = patientReport.report_id;

    // Delete the patient report
    await deletePatientReport(reportId, user_id, user_role);
    
    // Log the deletion event
    await logEvent('patient_deleted_legacy', 'patient_report', reportId, user_id, user_role, {
      deleted_patient: {
        legacy_id: id,
        name: patientReport.name,
        incident_type: patientReport.incident_type,
        status: patientReport.status,
        hospital_name: patientReport.hospital_name
      }
    });

    res.json({
      success: true,
      message: 'Patient deleted successfully',
      data: {
        id: id,
        report_id: reportId,
        patient_name: patientReport.name,
        deleted_by: user_id,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error deleting patient (legacy):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete patient',
      details: error.message
    });
  }
});

// ====================
// QUEUE MANAGEMENT ENDPOINTS
// ====================

/**
 * GET /api/hospitals - Get hospitals with optional location-based sorting
 */
app.get('/api/hospitals', async (req, res) => {
  try {
    const { latitude, longitude, criticality, transportation_mode } = req.query;
    
    // Import enhanced hospital selection
    const { enhancedHospitalSelection } = await import('./enhanced-hospital-selection.js');
    
    // If location provided, use enhanced selection
    if (latitude && longitude) {
      const userLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        criticality: criticality || 'moderate',
        transportation_mode: transportation_mode || 'self-carry'
      };
      
      const result = await enhancedHospitalSelection.getHospitalsWithDistances(userLocation);
      res.json(result);
    } else {
      // Fallback to basic hospital list
      const hospitals = await getHospitals();
      res.json({
        success: true,
        data: hospitals.map(hospital => ({
          ...hospital,
          distance_km: null,
          travel_time_minutes: null,
          location_status: 'location_not_provided'
        })),
        message: 'To get distance and travel time information, provide latitude and longitude parameters'
      });
    }
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospitals'
    });
  }
});

/**
 * POST /api/hospitals/best-selection - Get best hospital for specific case
 */
app.post('/api/hospitals/best-selection', async (req, res) => {
  try {
    const caseData = req.body;
    
    // Validate required fields
    if (!caseData.latitude || !caseData.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Patient location coordinates (latitude, longitude) are required'
      });
    }
    
    // Import enhanced hospital selection
    const { enhancedHospitalSelection } = await import('./enhanced-hospital-selection.js');
    
    const result = await enhancedHospitalSelection.getBestHospitalForCase(caseData);
    res.json(result);
    
  } catch (error) {
    console.error('Error selecting best hospital:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to select best hospital'
    });
  }
});

/**
 * GET /api/queue/:hospitalId - Get queue for specific hospital
 */
app.get('/api/queue/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const queueData = await getHospitalQueue(hospitalId);
    
    res.json({
      success: true,
      data: queueData
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue data'
    });
  }
});

/**
 * POST /api/queue/:reportId/move - Move patient in queue
 */
app.post('/api/queue/:reportId/move', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { direction, doctor_id, hospital_id } = req.body;
    
    // This is a simplified implementation
    // In production, you'd implement proper queue reordering logic
    logEvent('queue_move_requested', 'patient_queue', reportId, doctor_id, 'doctor', {
      direction,
      requested_by: doctor_id
    });
    
    // Send patient notification about queue position change
    try {
      const queueData = await getHospitalQueue(hospital_id);
      const patientQueue = queueData.queue.find(p => p.report_id === reportId);
      
      if (patientQueue) {
        await notifyPatientQueueUpdate(reportId, {
          hospital_name: queueData.hospital_name,
          queue_position: patientQueue.queue_position,
          estimated_wait_time: patientQueue.queue_position * 30 * 60 // 30 min per position
        });
        console.log(`Patient notified of queue position change: ${reportId}`);
      }
    } catch (notificationError) {
      console.warn(`Failed to notify patient of queue position change for ${reportId}:`, notificationError);
    }
    
    res.json({
      success: true,
      message: `Patient ${direction} movement requested`,
      report_id: reportId
    });
  } catch (error) {
    console.error('Error moving patient in queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to move patient in queue'
    });
  }
});

/**
 * POST /api/queue/:reportId/remove - Remove patient from queue
 */
app.post('/api/queue/:reportId/remove', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { reason, doctor_id } = req.body;
    
    const result = await removeFromQueue(reportId, reason);
    
    logEvent('queue_remove_requested', 'patient_queue', reportId, doctor_id, 'doctor', {
      reason,
      requested_by: doctor_id
    });
    
    res.json({
      success: true,
      message: 'Patient removed from queue',
      data: result
    });
  } catch (error) {
    console.error('Error removing patient from queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove patient from queue'
    });
  }
});

/**
 * POST /api/queue/update - Complete treatment and update queue for all patients
 * This endpoint allows doctors/nurses to mark a patient as completed and 
 * automatically notify all remaining patients of their updated queue positions
 */
app.post('/api/queue/update', async (req, res) => {
  try {
    const { 
      completed_patient_id, 
      hospital_id, 
      doctor_id, 
      doctor_name,
      user_role = 'doctor',
      completion_reason = 'treatment_completed'
    } = req.body;
    
    if (!completed_patient_id || !hospital_id) {
      return res.status(400).json({
        success: false,
        error: 'completed_patient_id and hospital_id are required'
      });
    }

    // Step 1: Remove completed patient from queue
    const removeResult = await removeFromQueue(completed_patient_id, completion_reason);
    
    // Step 2: Update patient status to completed
    await updateReportStatus(completed_patient_id, 'Completed', doctor_id);
    
    // Step 3: Get updated queue for the hospital
    const updatedQueue = await getHospitalQueue(hospital_id);
    
    // Step 4: Send notifications to all remaining patients about updated positions
    const notificationResults = [];
    
    for (const queueItem of updatedQueue.queue_items) {
      try {
        const notificationResult = await notifyPatientQueueUpdate(queueItem.report_id, {
          hospital_name: updatedQueue.hospital_name || 'Hospital',
          queue_position: queueItem.queue_position,
          estimated_wait_time: queueItem.estimated_wait_time
        });
        
        notificationResults.push({
          report_id: queueItem.report_id,
          success: notificationResult.success,
          channels_sent: notificationResult.channels_sent
        });
      } catch (notificationError) {
        console.warn(`Failed to notify patient ${queueItem.report_id}:`, notificationError);
        notificationResults.push({
          report_id: queueItem.report_id,
          success: false,
          error: notificationError.message
        });
      }
    }
    
    // Step 5: Notify the next patient that they're ready for treatment
    if (updatedQueue.queue_items.length > 0 && updatedQueue.queue_items[0].queue_position === 1) {
      const nextPatient = updatedQueue.queue_items[0];
      try {
        await notifyTreatmentReady(nextPatient.report_id, doctor_name || 'Doctor');
        console.log(`Next patient notified for treatment: ${nextPatient.report_id}`);
      } catch (treatmentNotifyError) {
        console.warn(`Failed to notify next patient for treatment ${nextPatient.report_id}:`, treatmentNotifyError);
      }
    }
    
    // Log the queue update event
    logEvent('queue_updated_by_staff', 'patient_queue', completed_patient_id, doctor_id, user_role, {
      hospital_id,
      completed_patient: completed_patient_id,
      remaining_patients: updatedQueue.queue_items.length,
      notifications_sent: notificationResults.filter(r => r.success).length,
      completion_reason
    });
    
    res.json({
      success: true,
      message: 'Queue updated successfully and patients notified',
      data: {
        completed_patient: completed_patient_id,
        updated_queue: {
          hospital_id,
          total_patients: updatedQueue.queue_items.length,
          next_patient: updatedQueue.queue_items[0]?.report_id || null
        },
        notification_results: {
          total_notifications: notificationResults.length,
          successful: notificationResults.filter(r => r.success).length,
          failed: notificationResults.filter(r => !r.success).length,
          details: notificationResults
        }
      }
    });
    
  } catch (error) {
    console.error('Error updating queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update queue',
      details: error.message
    });
  }
});

/**
 * POST /api/queue/notify-all/:hospitalId - Send position updates to all patients in queue
 * This endpoint allows nurses to manually send queue position updates to all patients
 */
app.post('/api/queue/notify-all/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { nurse_id, user_role = 'nurse', custom_message } = req.body;
    
    // Get current queue for the hospital
    const queueData = await getHospitalQueue(hospitalId);
    
    if (queueData.queue_items.length === 0) {
      return res.json({
        success: true,
        message: 'No patients in queue to notify',
        data: { notifications_sent: 0 }
      });
    }
    
    // Send notifications to all patients in queue
    const notificationResults = [];
    
    for (const queueItem of queueData.queue_items) {
      try {
        let notificationResult;
        
        if (custom_message) {
          // Send custom message
          const recipient = await getPatientContact(queueItem.report_id);
          if (recipient) {
            notificationResult = await queueNotification(
              queueItem.report_id, 
              'custom_message', 
              recipient, 
              custom_message, 
              'normal'
            );
          } else {
            notificationResult = { success: false, error: 'No contact info' };
          }
        } else {
          // Send standard queue position update
          notificationResult = await notifyPatientQueueUpdate(queueItem.report_id, {
            hospital_name: queueData.hospital_name || 'Hospital',
            queue_position: queueItem.queue_position,
            estimated_wait_time: queueItem.estimated_wait_time
          });
        }
        
        notificationResults.push({
          report_id: queueItem.report_id,
          patient_name: queueItem.name,
          queue_position: queueItem.queue_position,
          success: notificationResult.success,
          channels_sent: notificationResult.channels_sent
        });
      } catch (notificationError) {
        console.warn(`Failed to notify patient ${queueItem.report_id}:`, notificationError);
        notificationResults.push({
          report_id: queueItem.report_id,
          success: false,
          error: notificationError.message
        });
      }
    }
    
    // Log the bulk notification event
    logEvent('bulk_queue_notification', 'patient_queue', hospitalId, nurse_id, user_role, {
      hospital_id: hospitalId,
      total_patients: queueData.queue_items.length,
      notifications_sent: notificationResults.filter(r => r.success).length,
      notification_type: custom_message ? 'custom_message' : 'queue_update'
    });
    
    res.json({
      success: true,
      message: `Queue notifications sent to ${notificationResults.filter(r => r.success).length} patients`,
      data: {
        hospital_id: hospitalId,
        total_patients: queueData.queue_items.length,
        notification_results: {
          successful: notificationResults.filter(r => r.success).length,
          failed: notificationResults.filter(r => !r.success).length,
          details: notificationResults
        }
      }
    });
    
  } catch (error) {
    console.error('Error sending bulk queue notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send queue notifications',
      details: error.message
    });
  }
});

// ====================
// NOTIFICATION ENDPOINTS
// ====================

/**
 * POST /api/notifications/send - Send notification to doctor
 */
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { type, recipient, message, subject, priority = 'normal' } = req.body;
    
    // Create a dummy report ID for doctor notifications
    const reportId = `DOCTOR_NOTIF_${Date.now()}`;
    
    const result = await queueNotification(reportId, type, recipient, message, priority);
    
    res.json({
      success: true,
      message: 'Notification queued successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue notification'
    });
  }
});

// ====================
// DOCTOR ASSIGNMENT ENDPOINTS  
// ====================

/**
 * POST /api/doctors/assign - Assign doctor to patient
 */
app.post('/api/doctors/assign', async (req, res) => {
  try {
    const { report_id, hospital_id, incident_type, criticality, patient_age } = req.body;
    
    if (!report_id || !hospital_id) {
      return res.status(400).json({
        success: false,
        error: 'report_id and hospital_id are required'
      });
    }

    const assignment = await assignDoctorToPatient(
      report_id,
      hospital_id,
      incident_type,
      criticality,
      patient_age
    );

    res.json({
      success: assignment.success,
      data: assignment
    });
  } catch (error) {
    console.error('Error assigning doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign doctor'
    });
  }
});

/**
 * POST /api/doctors/release - Release doctor from patient
 */
app.post('/api/doctors/release', async (req, res) => {
  try {
    const { report_id } = req.body;
    
    if (!report_id) {
      return res.status(400).json({
        success: false,
        error: 'report_id is required'
      });
    }

    const result = await releaseDoctorFromPatient(report_id);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error releasing doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release doctor'
    });
  }
});

/**
 * GET /api/doctors/stats/:hospitalId - Get doctor assignment statistics
 */
app.get('/api/doctors/stats/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const stats = await getAssignmentStats(hospitalId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching doctor stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor statistics'
    });
  }
});

/**
 * GET /api/doctors/specialties/:hospitalId - Get available specialties
 */
app.get('/api/doctors/specialties/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const specialties = await getAvailableSpecialties(hospitalId);

    res.json({
      success: true,
      data: specialties
    });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available specialties'
    });
  }
});

// ====================
// PATIENT NOTIFICATION ENDPOINTS
// ====================

/**
 * POST /api/patients/notify/queue-update - Send queue update to patient
 */
app.post('/api/patients/notify/queue-update', async (req, res) => {
  try {
    const { report_id, queue_data } = req.body;
    
    if (!report_id || !queue_data) {
      return res.status(400).json({
        success: false,
        error: 'report_id and queue_data are required'
      });
    }

    const result = await notifyPatientQueueUpdate(report_id, queue_data);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error sending queue update notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send queue update notification'
    });
  }
});

/**
 * POST /api/patients/notify/status-update - Send status update to patient
 */
app.post('/api/patients/notify/status-update', async (req, res) => {
  try {
    const { report_id, new_status, assigned_doctor } = req.body;
    
    if (!report_id || !new_status) {
      return res.status(400).json({
        success: false,
        error: 'report_id and new_status are required'
      });
    }

    const result = await notifyPatientStatusUpdate(report_id, new_status, assigned_doctor);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error sending status update notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send status update notification'
    });
  }
});

/**
 * POST /api/patients/notify/treatment-ready - Send treatment ready notification
 */
app.post('/api/patients/notify/treatment-ready', async (req, res) => {
  try {
    const { report_id, doctor_name } = req.body;
    
    if (!report_id || !doctor_name) {
      return res.status(400).json({
        success: false,
        error: 'report_id and doctor_name are required'
      });
    }

    const result = await notifyTreatmentReady(report_id, doctor_name);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error sending treatment ready notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send treatment ready notification'
    });
  }
});

// ====================
// TREATED PATIENTS ENDPOINTS
// ====================

/**
 * POST /api/treated-patients - Create new treated patient record
 */
app.post('/api/treated-patients', async (req, res) => {
  try {
    const treatedData = req.body;
    
    // Validate required fields
    const requiredFields = ['report_id', 'patient_name', 'age_range', 'gender', 'incident_type', 'hospital_id'];
    const missingFields = requiredFields.filter(field => !treatedData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing_fields: missingFields
      });
    }

    const result = await createTreatedPatient(treatedData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Treated patient record created successfully'
    });
  } catch (error) {
    console.error('Error creating treated patient record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create treated patient record',
      details: error.message
    });
  }
});

/**
 * GET /api/treated-patients - Get all treated patients with optional filters
 */
app.get('/api/treated-patients', async (req, res) => {
  try {
    const filters = {};
    
    // Extract query parameters for filtering
    if (req.query.hospital_id) filters.hospital_id = req.query.hospital_id;
    if (req.query.treating_doctor_id) filters.treating_doctor_id = req.query.treating_doctor_id;
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;
    if (req.query.outcome) filters.outcome = req.query.outcome;
    
    const treatedPatients = await getTreatedPatients(filters);
    
    res.json({
      success: true,
      data: treatedPatients,
      count: treatedPatients.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error fetching treated patients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treated patients'
    });
  }
});

/**
 * PATCH /api/treated-patients/:reportId - Update treated patient record
 */
app.patch('/api/treated-patients/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const updateData = req.body;
    
    const result = await updateTreatedPatient(reportId, updateData);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Treated patient record not found or no changes made'
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: 'Treated patient record updated successfully'
    });
  } catch (error) {
    console.error('Error updating treated patient record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update treated patient record'
    });
  }
});

/**
 * GET /api/treated-patients/stats - Get treated patients statistics
 */
app.get('/api/treated-patients/stats', async (req, res) => {
  try {
    const { hospital_id } = req.query;
    const stats = await getTreatedPatientStats(hospital_id);
    
    res.json({
      success: true,
      data: stats,
      hospital_id: hospital_id || 'all'
    });
  } catch (error) {
    console.error('Error fetching treated patient stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treated patient statistics'
    });
  }
});

/**
 * POST /api/complete-treatment - Complete treatment and move patient to treated section
 */
app.post('/api/complete-treatment', async (req, res) => {
  try {
    const {
      report_id,
      hospital_id,
      treating_doctor_id,
      treating_doctor_name,
      treatment_notes,
      treatment_outcome,
      discharge_status = 'discharged',
      follow_up_required = false,
      follow_up_notes,
      patient_satisfaction_rating,
      treatment_started_at
    } = req.body;
    
    if (!report_id || !hospital_id) {
      return res.status(400).json({
        success: false,
        error: 'report_id and hospital_id are required'
      });
    }

    // Step 1: Get patient report details
    const reports = await getPatientReports({ report_id });
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient report not found'
      });
    }
    
    const patientReport = reports[0];
    
    // Get hospital name from hospital_id
    const hospitals = await getHospitals();
    const hospital = hospitals.find(h => h.hospital_id === hospital_id);
    const hospitalName = hospital ? hospital.name : 'Unknown Hospital';
    
    // Step 2: Calculate treatment duration if treatment_started_at is provided
    let treatmentDurationMinutes = null;
    if (treatment_started_at) {
      const startTime = new Date(treatment_started_at);
      const endTime = new Date();
      treatmentDurationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    }
    
    // Step 3: Create treated patient record
    const treatedPatientData = {
      report_id,
      patient_name: patientReport.name,
      trn: patientReport.trn,
      age_range: patientReport.age_range,
      gender: patientReport.gender,
      incident_type: patientReport.incident_type,
      incident_description: patientReport.incident_description,
      original_criticality: patientReport.ai_criticality || patientReport.criticality,
      hospital_id,
      hospital_name: hospitalName,
      treating_doctor_id,
      treating_doctor_name,
      treatment_started_at,
      treatment_duration_minutes: treatmentDurationMinutes,
      treatment_notes,
      treatment_outcome,
      discharge_status,
      follow_up_required,
      follow_up_notes,
      patient_satisfaction_rating
    };
    
    const treatedPatient = await createTreatedPatient(treatedPatientData);
    
    // Step 4: Update patient status to completed
    await updateReportStatus(report_id, 'Completed', treating_doctor_id);
    
    // Step 5: Send treatment completed notification to patient
    try {
      await notifyTreatmentCompleted(report_id, treating_doctor_name || 'Medical Staff', {
        discharge_status,
        completion_time: new Date().toISOString(),
        treatment_summary: treatment_notes || 'Your treatment has been completed successfully.',
        discharge_instructions: 'Please follow any discharge instructions provided by your medical team.',
        follow_up_required,
        follow_up_notes
      });
      console.log(`Treatment completed notification sent: ${report_id}`);
    } catch (notificationError) {
      console.warn(`Failed to send treatment completion notification for ${report_id}:`, notificationError);
    }
    
    // Step 6: Remove from queue if still in queue
    try {
      await fetch(`http://localhost:${PORT}/api/queue/${report_id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'treatment_completed', doctor_id: treating_doctor_id })
      });
    } catch (queueError) {
      console.warn(`Failed to remove patient from queue: ${queueError.message}`);
    }
    
    res.json({
      success: true,
      data: {
        treated_patient: treatedPatient,
        patient_report_status: 'Completed'
      },
      message: 'Treatment completed successfully and patient moved to treated section'
    });
    
  } catch (error) {
    console.error('Error completing treatment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete treatment',
      details: error.message
    });
  }
});

// ====================
// SYSTEM MONITORING AND HEALTH ENDPOINTS
// ====================

/**
 * GET /api/health - System health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Emergency Triage System operational',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'automated_triage',
      'hospital_selection',
      'queue_management',
      'real_time_tracking',
      'event_logging'
    ]
  });
});

/**
 * GET /api/stats - System statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const reports = await getPatientReports();
    
    const stats = {
      total_reports: reports.length,
      status_breakdown: {},
      criticality_breakdown: {},
      recent_reports: reports.slice(0, 5).length,
      processing_times: {
        avg_triage_time: '2.3s', // Placeholder
        avg_assignment_time: '4.7s'
      }
    };

    // Calculate status breakdown
    reports.forEach(report => {
      stats.status_breakdown[report.status] = (stats.status_breakdown[report.status] || 0) + 1;
      if (report.criticality) {
        stats.criticality_breakdown[report.criticality] = (stats.criticality_breakdown[report.criticality] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate statistics'
    });
  }
});

// ====================
// MEDICAL STAFF ACCESS ENDPOINTS
// ====================

/**
 * POST /api/medical-staff/request-access - Request medical staff access credentials
 */
app.post('/api/medical-staff/request-access', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Validate required fields
    const requiredFields = ['email', 'role', 'firstName', 'lastName', 'hospitalAffiliation', 'medicalLicense'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missing_fields: missingFields
      });
    }
    
    // Process the access request
    const result = await medicalStaffService.processAccessRequest(req.body, clientIP);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Medical staff access request error:', error);
    
    // Handle specific error types
    if (error.message.includes('Too many requests')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Invalid email')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process access request. Please try again later.'
    });
  }
});

/**
 * POST /api/medical-staff/validate-login - Validate medical staff login credentials
 */
app.post('/api/medical-staff/validate-login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and role are required'
      });
    }
    
    const result = await medicalStaffService.validateLogin(username, password, role);
    
    if (result.valid) {
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('Medical staff login validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Login validation failed. Please try again.'
    });
  }
});

/**
 * GET /api/medical-staff/stats - Get medical staff service statistics (admin only)
 */
app.get('/api/medical-staff/stats', async (req, res) => {
  try {
    // In production, you'd want proper admin authentication here
    const stats = await medicalStaffService.getServiceStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Medical staff stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * GET /api/medical-staff/credentials - Get all valid credentials (admin only)
 */
app.get('/api/medical-staff/credentials', async (req, res) => {
  try {
    // In production, you'd want proper admin authentication here
    const credentials = await medicalStaffService.getValidCredentials();
    
    res.json({
      success: true,
      data: credentials,
      count: credentials.length
    });
    
  } catch (error) {
    console.error('Medical staff credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve credentials'
    });
  }
});

// ====================
// ROOT AND WELCOME ENDPOINTS
// ====================

/**
 * GET / - Welcome endpoint for Railway URL
 */
app.get('/', (req, res) => {
  res.json({
    name: 'MySpaceER Enhanced Emergency Triage System',
    status: 'operational',
    version: '2.0.0',
    message: 'Emergency Response System Backend - Enhanced Version',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: [
      'automated_triage',
      'hospital_selection', 
      'queue_management',
      'real_time_tracking',
      'patient_notifications'
    ],
    endpoints: {
      health: '/api/health',
      reports: '/api/reports',
      patients: '/api/patients',
      hospitals: '/api/hospitals',
      queue: '/api/queue/:hospitalId',
      stats: '/api/stats'
    }
  });
});

// ====================
// ERROR HANDLING AND 404
// ====================

// Apply secure error handler
app.use(secureErrorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'POST /api/reports - Submit patient report',
      'GET /api/reports - List all reports',
      'GET /api/reports/:id - Get specific report',
      'PATCH /api/reports/:id/status - Update report status',
      'POST /api/reports/:id/location - Update location',
      'GET /api/queue/:hospitalId - Get hospital queue',
      'POST /api/queue/update - Complete patient treatment and update queue',
      'POST /api/queue/notify-all/:hospitalId - Send updates to all patients in queue',
      'GET /api/health - Health check',
      'GET /api/stats - System statistics'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Only start server if this is the main module (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.env.START_SERVER === 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Enhanced Emergency Triage Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🏠 Root endpoint: http://localhost:${PORT}/`);
    console.log('\n🚨 Emergency Triage System Features:');
    console.log('   ✅ Automated triage with deterministic rules + ML');
    console.log('   ✅ Hospital selection with travel time optimization');
    console.log('   ✅ Priority queue management');
    console.log('   ✅ Real-time event logging and tracking');
    console.log('   ✅ Backward compatibility with existing frontend');
    console.log('\n📋 Key API Endpoints:');
    console.log('   POST /api/reports - Submit new patient report');
    console.log('   GET  /api/reports - List all reports with triage data');
    console.log('   GET  /api/health  - System health and status');
    console.log('   GET  /api/stats   - System statistics and metrics\n');
  });
}

export default app;
