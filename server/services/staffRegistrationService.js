/**
 * Medical Staff Registration Service
 * 
 * Allows doctors and nurses to register themselves in the system
 * with their credentials, specialties, and shift schedules.
 */

import { db, logEvent } from '../database-enhanced.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class StaffRegistrationService {
  /**
   * Register new medical staff member
   */
  async registerStaff(staffData) {
    const {
      email,
      password,
      name,
      role, // 'doctor' or 'nurse'
      license_number,
      specialties, // Array of specialties
      hospital_id,
      phone,
      emergency_contact,
      shift_preferences,
      max_concurrent_patients = 5,
    } = staffData;

    // Validate required fields
    if (!email || !password || !name || !role || !license_number || !hospital_id) {
      throw new Error('Missing required fields');
    }

    // Check if email already exists
    const existingStaff = await this.getStaffByEmail(email);
    if (existingStaff) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate staff ID
    const staffId = `${role.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Insert into medical_staff table
    const insertStaffQuery = `
      INSERT INTO medical_staff (
        staff_id, name, email, password_hash, role, license_number,
        specialties, hospital_id, phone, emergency_contact,
        is_verified, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'))
    `;

    return new Promise((resolve, reject) => {
      db.run(
        insertStaffQuery,
        [
          staffId,
          name,
          email,
          hashedPassword,
          role,
          license_number,
          JSON.stringify(specialties || []),
          hospital_id,
          phone,
          emergency_contact,
        ],
        function (err) {
          if (err) {
            console.error('Failed to register staff:', err);
            reject(err);
            return;
          }

          // If doctor, create default shift schedule
          if (role === 'doctor') {
            const insertShiftQuery = `
              INSERT INTO doctor_shifts (
                doctor_id, doctor_name, hospital_id, specialties,
                shift_start, shift_end, max_concurrent_patients,
                current_patient_count, is_available
              ) VALUES (?, ?, ?, ?, '08:00', '20:00', ?, 0, 1)
            `;

            db.run(
              insertShiftQuery,
              [staffId, name, hospital_id, JSON.stringify(specialties || []), max_concurrent_patients],
              (shiftErr) => {
                if (shiftErr) {
                  console.warn('Failed to create default shift:', shiftErr);
                }
              }
            );
          }

          logEvent('staff_registered', 'staff_management', staffId, null, hospital_id, {
            name,
            role,
            email,
          });

          resolve({
            success: true,
            staff_id: staffId,
            message: 'Staff registered successfully. Pending verification.',
          });
        }
      );
    });
  }

  /**
   * Login for medical staff
   */
  async loginStaff(email, password) {
    const staff = await this.getStaffByEmail(email);

    if (!staff) {
      throw new Error('Invalid credentials');
    }

    if (!staff.is_active) {
      throw new Error('Account is inactive. Please contact administrator.');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, staff.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        staff_id: staff.staff_id,
        email: staff.email,
        role: staff.role,
        hospital_id: staff.hospital_id,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' } // Shift duration
    );

    logEvent('staff_login', 'authentication', staff.staff_id, null, staff.hospital_id);

    return {
      success: true,
      token,
      staff: {
        id: staff.staff_id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        hospital_id: staff.hospital_id,
        specialties: staff.specialties,
        is_verified: staff.is_verified,
      },
    };
  }

  /**
   * Get staff by email
   */
  async getStaffByEmail(email) {
    const query = `
      SELECT * FROM medical_staff WHERE email = ?
    `;

    return new Promise((resolve, reject) => {
      db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row && row.specialties) {
            row.specialties = JSON.parse(row.specialties);
          }
          resolve(row);
        }
      });
    });
  }

  /**
   * Update staff shift schedule
   */
  async updateShiftSchedule(staffId, shiftData) {
    const { shift_start, shift_end, days_of_week, max_concurrent_patients } = shiftData;

    const updateQuery = `
      UPDATE doctor_shifts
      SET shift_start = ?,
          shift_end = ?,
          max_concurrent_patients = ?,
          updated_at = datetime('now')
      WHERE doctor_id = ?
    `;

    return new Promise((resolve, reject) => {
      db.run(
        updateQuery,
        [shift_start, shift_end, max_concurrent_patients, staffId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, message: 'Shift schedule updated' });
          }
        }
      );
    });
  }

  /**
   * Toggle staff availability
   */
  async toggleAvailability(staffId, isAvailable) {
    const updateQuery = `
      UPDATE doctor_shifts
      SET is_available = ?
      WHERE doctor_id = ?
    `;

    return new Promise((resolve, reject) => {
      db.run(updateQuery, [isAvailable ? 1 : 0, staffId], function (err) {
        if (err) {
          reject(err);
        } else {
          logEvent('availability_changed', 'staff_management', staffId, null, null, {
            is_available: isAvailable,
          });
          resolve({ success: true, is_available: isAvailable });
        }
      });
    });
  }

  /**
   * Get all staff at a hospital
   */
  async getHospitalStaff(hospitalId, role = null) {
    let query = `
      SELECT staff_id, name, email, role, license_number, specialties, 
             phone, is_verified, is_active, created_at
      FROM medical_staff
      WHERE hospital_id = ?
    `;

    const params = [hospitalId];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY name ASC';

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const staff = rows.map((row) => ({
            ...row,
            specialties: row.specialties ? JSON.parse(row.specialties) : [],
          }));
          resolve(staff);
        }
      });
    });
  }

  /**
   * Verify staff member (admin function)
   */
  async verifyStaff(staffId, verifiedBy) {
    const updateQuery = `
      UPDATE medical_staff
      SET is_verified = 1,
          verified_at = datetime('now'),
          verified_by = ?
      WHERE staff_id = ?
    `;

    return new Promise((resolve, reject) => {
      db.run(updateQuery, [verifiedBy, staffId], function (err) {
        if (err) {
          reject(err);
        } else {
          logEvent('staff_verified', 'staff_management', staffId, verifiedBy, null);
          resolve({ success: true, message: 'Staff member verified' });
        }
      });
    });
  }
}

export default new StaffRegistrationService();
