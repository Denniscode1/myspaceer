/**
 * Medical Staff Routes
 * 
 * Endpoints for doctor/nurse registration, login, and management
 */

import express from 'express';
import staffRegistrationService from '../services/staffRegistrationService.js';

const router = express.Router();

/**
 * POST /api/staff/register
 * Register new medical staff (doctor or nurse)
 */
router.post('/register', async (req, res) => {
  try {
    const result = await staffRegistrationService.registerStaff(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Staff registration failed:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/staff/login
 * Login for medical staff
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await staffRegistrationService.loginStaff(email, password);
    res.json(result);
  } catch (error) {
    console.error('Staff login failed:', error);
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/staff/hospital/:hospitalId
 * Get all staff at a hospital
 */
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { role } = req.query; // Optional: filter by role (doctor/nurse)
    const staff = await staffRegistrationService.getHospitalStaff(hospitalId, role);
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Failed to get hospital staff:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/staff/:staffId/shift
 * Update shift schedule
 */
router.put('/:staffId/shift', async (req, res) => {
  try {
    const { staffId } = req.params;
    const result = await staffRegistrationService.updateShiftSchedule(staffId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Failed to update shift schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/staff/:staffId/availability
 * Toggle staff availability (on/off duty)
 */
router.put('/:staffId/availability', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { is_available } = req.body;
    const result = await staffRegistrationService.toggleAvailability(staffId, is_available);
    res.json(result);
  } catch (error) {
    console.error('Failed to toggle availability:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/staff/:staffId/verify
 * Verify staff member (admin only)
 */
router.put('/:staffId/verify', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { verified_by } = req.body;
    const result = await staffRegistrationService.verifyStaff(staffId, verified_by);
    res.json(result);
  } catch (error) {
    console.error('Failed to verify staff:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
