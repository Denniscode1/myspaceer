import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {
  initializeDatabase,
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
} from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database on server start
initializeDatabase()
  .then(() => {
    console.log('Database ready');
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

// API Routes

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await getAllPatients();
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patients' });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (patient) {
      res.json({ success: true, data: patient });
    } else {
      res.status(404).json({ success: false, error: 'Patient not found' });
    }
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient' });
  }
});

// Create new patient
app.post('/api/patients', async (req, res) => {
  try {
    const patientData = req.body;
    
    // Basic validation
    if (!patientData.firstName || !patientData.lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name and last name are required' 
      });
    }

    const newPatient = await createPatient(patientData);
    res.status(201).json({ success: true, data: newPatient });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ success: false, error: 'Failed to create patient' });
  }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
  try {
    const patientData = req.body;
    const patientId = req.params.id;

    // Check if patient exists
    const existingPatient = await getPatientById(patientId);
    if (!existingPatient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const updatedPatient = await updatePatient(patientId, patientData);
    res.json({ success: true, data: updatedPatient });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ success: false, error: 'Failed to update patient' });
  }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const patientId = req.params.id;

    // Check if patient exists
    const existingPatient = await getPatientById(patientId);
    if (!existingPatient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const result = await deletePatient(patientId);
    res.json({ success: true, message: 'Patient deleted successfully', data: result });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ success: false, error: 'Failed to delete patient' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});