import { db, logEvent } from '../database-enhanced.js';
import { notifyDoctorAssignment } from './patientNotificationService.js';

/**
 * Doctor Assignment Service
 * Handles assignment of doctors to patients based on specialties, availability, and workload distribution
 */
export class DoctorAssignmentService {
  constructor() {
    this.specialtyMatching = {
      // Emergency incident types mapped to required medical specialties
      'shooting': ['emergency_medicine', 'surgery', 'trauma', 'critical_care'],
      'stabbing': ['emergency_medicine', 'surgery', 'trauma', 'critical_care'],
      'car_accident': ['emergency_medicine', 'trauma', 'orthopedics', 'neurology'],
      'motorcycle_accident': ['emergency_medicine', 'trauma', 'orthopedics', 'neurology'],
      'fall': ['emergency_medicine', 'orthopedics', 'neurology'],
      'burn': ['emergency_medicine', 'burn_care', 'plastic_surgery', 'critical_care'],
      'poisoning': ['emergency_medicine', 'toxicology', 'critical_care'],
      'overdose': ['emergency_medicine', 'toxicology', 'psychiatry'],
      'heart_attack': ['emergency_medicine', 'cardiology', 'critical_care'],
      'stroke': ['emergency_medicine', 'neurology', 'critical_care'],
      'seizure': ['emergency_medicine', 'neurology'],
      'allergic_reaction': ['emergency_medicine', 'allergy_immunology'],
      'respiratory_distress': ['emergency_medicine', 'pulmonology', 'critical_care'],
      'chest_pain': ['emergency_medicine', 'cardiology'],
      'abdominal_pain': ['emergency_medicine', 'gastroenterology', 'surgery'],
      'pregnancy_complications': ['emergency_medicine', 'obstetrics', 'gynecology'],
      'pediatric_emergency': ['emergency_medicine', 'pediatrics'],
      'psychiatric_emergency': ['emergency_medicine', 'psychiatry'],
      'general': ['emergency_medicine', 'internal_medicine']
    };

    this.criticalityWeights = {
      'Critical': 10,
      'High': 7,
      'Medium': 4,
      'Low': 1
    };
  }

  /**
   * Assign a doctor to a patient based on optimal matching criteria
   */
  async assignDoctorToPatient(reportId, hospitalId, incidentType, criticality, patientAge = null) {
    try {
      console.log(`Starting doctor assignment for report ${reportId} at hospital ${hospitalId}`);

      // Get available doctors at the hospital
      const availableDoctors = await this.getAvailableDoctors(hospitalId);
      
      if (availableDoctors.length === 0) {
        console.log(`No available doctors at hospital ${hospitalId}`);
        return {
          success: false,
          error: 'No available doctors at this hospital',
          assigned_doctor: null
        };
      }

      // Score and rank doctors based on matching criteria
      const scoredDoctors = await this.scoreDoctorsForCase(
        availableDoctors, 
        incidentType, 
        criticality, 
        patientAge
      );

      // Select the best doctor
      const bestDoctor = scoredDoctors[0];

      if (!bestDoctor) {
        return {
          success: false,
          error: 'No suitable doctor found',
          assigned_doctor: null
        };
      }

      // Assign the doctor
      const assignment = await this.performAssignment(reportId, bestDoctor, incidentType);
      
      if (assignment.success) {
        console.log(`Doctor ${bestDoctor.doctor_name} assigned to report ${reportId}`);
        
        // Send notification to patient about doctor assignment
        try {
          await notifyDoctorAssignment(reportId, bestDoctor.doctor_name);
        } catch (notificationError) {
          console.warn('Failed to notify patient of doctor assignment:', notificationError);
        }

        // Log the assignment
        logEvent('doctor_assigned', 'doctor_assignment', reportId, bestDoctor.doctor_id, hospitalId, {
          doctor_name: bestDoctor.doctor_name,
          specialties: bestDoctor.specialties,
          incident_type: incidentType,
          criticality: criticality,
          match_score: bestDoctor.score,
          workload_before: bestDoctor.current_patient_count,
          workload_after: bestDoctor.current_patient_count + 1
        });
      }

      return assignment;

    } catch (error) {
      console.error('Doctor assignment failed:', error);
      throw error;
    }
  }

  /**
   * Get available doctors at a specific hospital
   */
  async getAvailableDoctors(hospitalId) {
    const query = `
      SELECT 
        doctor_id,
        doctor_name,
        specialties,
        shift_start,
        shift_end,
        max_concurrent_patients,
        current_patient_count,
        is_available
      FROM doctor_shifts 
      WHERE hospital_id = ? 
        AND is_available = 1 
        AND current_patient_count < max_concurrent_patients
        AND datetime('now', 'localtime') BETWEEN shift_start AND shift_end
      ORDER BY current_patient_count ASC, doctor_name ASC
    `;

    return new Promise((resolve, reject) => {
      db.all(query, [hospitalId], (err, rows) => {
        if (err) {
          console.error('Failed to get available doctors:', err);
          reject(err);
        } else {
          // Parse specialties JSON string
          const doctors = rows.map(doctor => ({
            ...doctor,
            specialties: doctor.specialties ? JSON.parse(doctor.specialties) : []
          }));
          console.log(`Found ${doctors.length} available doctors at hospital ${hospitalId}`);
          resolve(doctors);
        }
      });
    });
  }

  /**
   * Score doctors based on specialty matching, workload, and other factors
   */
  async scoreDoctorsForCase(doctors, incidentType, criticality, patientAge) {
    const requiredSpecialties = this.getRequiredSpecialties(incidentType);
    const criticalityWeight = this.criticalityWeights[criticality] || 1;

    const scoredDoctors = doctors.map(doctor => {
      let score = 0;
      const explanation = [];

      // Specialty matching score (0-100 points)
      const specialtyScore = this.calculateSpecialtyScore(doctor.specialties, requiredSpecialties);
      score += specialtyScore;
      explanation.push(`Specialty match: ${specialtyScore}/100`);

      // Workload score (0-50 points) - prefer doctors with lighter loads
      const workloadCapacity = doctor.max_concurrent_patients;
      const currentLoad = doctor.current_patient_count;
      const workloadScore = Math.round(((workloadCapacity - currentLoad) / workloadCapacity) * 50);
      score += workloadScore;
      explanation.push(`Workload score: ${workloadScore}/50 (${currentLoad}/${workloadCapacity} patients)`);

      // Criticality bonus (0-30 points) - high criticality cases get preference for experienced doctors
      if (criticality === 'Critical' && doctor.specialties.includes('critical_care')) {
        score += 30;
        explanation.push('Critical care specialty bonus: +30');
      } else if (criticality === 'High' && (doctor.specialties.includes('emergency_medicine') || doctor.specialties.includes('trauma'))) {
        score += 15;
        explanation.push('Emergency/trauma specialty bonus: +15');
      }

      // Age-specific bonuses
      if (patientAge !== null) {
        if (patientAge < 18 && doctor.specialties.includes('pediatrics')) {
          score += 25;
          explanation.push('Pediatric specialty bonus: +25');
        } else if (patientAge >= 65 && doctor.specialties.includes('geriatrics')) {
          score += 15;
          explanation.push('Geriatric specialty bonus: +15');
        }
      }

      // Apply criticality weight to final score
      score *= (1 + (criticalityWeight / 10));
      
      return {
        ...doctor,
        score: Math.round(score),
        scoring_explanation: explanation,
        required_specialties: requiredSpecialties
      };
    });

    // Sort by score (descending) and return
    return scoredDoctors.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate specialty matching score
   */
  calculateSpecialtyScore(doctorSpecialties, requiredSpecialties) {
    if (requiredSpecialties.length === 0) return 50; // Default score if no specific requirements

    const matchCount = requiredSpecialties.filter(required => 
      doctorSpecialties.includes(required)
    ).length;

    const matchPercentage = (matchCount / requiredSpecialties.length) * 100;
    
    // Bonus for emergency medicine (always valuable)
    const hasEmergencyMedicine = doctorSpecialties.includes('emergency_medicine');
    const emergencyBonus = hasEmergencyMedicine ? 20 : 0;

    return Math.min(100, Math.round(matchPercentage + emergencyBonus));
  }

  /**
   * Get required specialties for an incident type
   */
  getRequiredSpecialties(incidentType) {
    const normalizedType = incidentType ? incidentType.toLowerCase().replace(/\s+/g, '_') : 'general';
    return this.specialtyMatching[normalizedType] || this.specialtyMatching['general'];
  }

  /**
   * Perform the actual doctor assignment
   */
  async performAssignment(reportId, doctor, incidentType) {
    const updateDoctorQuery = `
      UPDATE doctor_shifts 
      SET current_patient_count = current_patient_count + 1
      WHERE doctor_id = ? AND hospital_id = ?
    `;

    const updateReportQuery = `
      UPDATE patient_reports 
      SET assigned_doctor_id = ?, 
          assigned_doctor_name = ?, 
          doctor_assigned_at = datetime('now', 'localtime'),
          status = 'Assigned'
      WHERE report_id = ?
    `;

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Update doctor's patient count
        db.run(updateDoctorQuery, [doctor.doctor_id, doctor.hospital_id], function(err) {
          if (err) {
            console.error('Failed to update doctor patient count:', err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          // Update patient report with assigned doctor
          db.run(updateReportQuery, [doctor.doctor_id, doctor.doctor_name, reportId], function(err) {
            if (err) {
              console.error('Failed to update patient report with doctor assignment:', err);
              db.run('ROLLBACK');
              reject(err);
              return;
            }

            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Failed to commit doctor assignment:', err);
                reject(err);
              } else {
                resolve({
                  success: true,
                  assigned_doctor: {
                    id: doctor.doctor_id,
                    name: doctor.doctor_name,
                    specialties: doctor.specialties,
                    score: doctor.score,
                    workload: doctor.current_patient_count + 1,
                    max_capacity: doctor.max_concurrent_patients
                  },
                  assignment_details: {
                    incident_type: incidentType,
                    required_specialties: doctor.required_specialties,
                    match_explanation: doctor.scoring_explanation
                  }
                });
              }
            });
          });
        });
      });
    });
  }

  /**
   * Release a doctor from a patient (when treatment is complete)
   */
  async releaseDoctorFromPatient(reportId) {
    try {
      // Get current assignment
      const getAssignmentQuery = `
        SELECT assigned_doctor_id, hospital_id 
        FROM patient_reports 
        WHERE report_id = ? AND assigned_doctor_id IS NOT NULL
      `;

      return new Promise((resolve, reject) => {
        db.get(getAssignmentQuery, [reportId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve({ success: true, message: 'No doctor assigned to release' });
            return;
          }

          // Update doctor's patient count
          const updateDoctorQuery = `
            UPDATE doctor_shifts 
            SET current_patient_count = current_patient_count - 1
            WHERE doctor_id = ? AND hospital_id = ? AND current_patient_count > 0
          `;

          const updateReportQuery = `
            UPDATE patient_reports 
            SET doctor_released_at = datetime('now', 'localtime')
            WHERE report_id = ?
          `;

          db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(updateDoctorQuery, [row.assigned_doctor_id, row.hospital_id], function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              db.run(updateReportQuery, [reportId], function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                db.run('COMMIT', (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log(`Doctor released from patient ${reportId}`);
                    logEvent('doctor_released', 'doctor_assignment', reportId, row.assigned_doctor_id, row.hospital_id);
                    resolve({ success: true, message: 'Doctor successfully released' });
                  }
                });
              });
            });
          });
        });
      });

    } catch (error) {
      console.error('Failed to release doctor from patient:', error);
      throw error;
    }
  }

  /**
   * Get assignment statistics for a hospital
   */
  async getAssignmentStats(hospitalId) {
    const query = `
      SELECT 
        ds.doctor_name,
        ds.specialties,
        ds.current_patient_count,
        ds.max_concurrent_patients,
        ds.is_available,
        COUNT(pr.assigned_doctor_id) as total_assignments_today
      FROM doctor_shifts ds
      LEFT JOIN patient_reports pr ON ds.doctor_id = pr.assigned_doctor_id 
        AND date(pr.doctor_assigned_at) = date('now', 'localtime')
      WHERE ds.hospital_id = ?
      GROUP BY ds.doctor_id, ds.doctor_name
      ORDER BY ds.current_patient_count DESC, total_assignments_today DESC
    `;

    return new Promise((resolve, reject) => {
      db.all(query, [hospitalId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const stats = rows.map(row => ({
            ...row,
            specialties: row.specialties ? JSON.parse(row.specialties) : [],
            utilization: row.max_concurrent_patients > 0 ? 
              Math.round((row.current_patient_count / row.max_concurrent_patients) * 100) : 0
          }));
          resolve(stats);
        }
      });
    });
  }

  /**
   * Get available specialties at a hospital
   */
  async getAvailableSpecialties(hospitalId) {
    const query = `
      SELECT DISTINCT specialties 
      FROM doctor_shifts 
      WHERE hospital_id = ? AND is_available = 1
    `;

    return new Promise((resolve, reject) => {
      db.all(query, [hospitalId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const allSpecialties = new Set();
          rows.forEach(row => {
            if (row.specialties) {
              const specialties = JSON.parse(row.specialties);
              specialties.forEach(specialty => allSpecialties.add(specialty));
            }
          });
          resolve(Array.from(allSpecialties).sort());
        }
      });
    });
  }

  /**
   * Get service configuration and statistics
   */
  getServiceInfo() {
    return {
      supported_incident_types: Object.keys(this.specialtyMatching),
      specialty_mapping: this.specialtyMatching,
      criticality_weights: this.criticalityWeights,
      scoring_components: [
        'Specialty matching (0-100 points)',
        'Workload distribution (0-50 points)', 
        'Criticality bonuses (0-30 points)',
        'Age-specific bonuses (0-25 points)'
      ]
    };
  }
}

// Create singleton instance
export const doctorAssignmentService = new DoctorAssignmentService();

// Export utility functions
export const assignDoctorToPatient = (reportId, hospitalId, incidentType, criticality, patientAge) =>
  doctorAssignmentService.assignDoctorToPatient(reportId, hospitalId, incidentType, criticality, patientAge);

export const releaseDoctorFromPatient = (reportId) =>
  doctorAssignmentService.releaseDoctorFromPatient(reportId);

export const getAssignmentStats = (hospitalId) =>
  doctorAssignmentService.getAssignmentStats(hospitalId);

export const getAvailableSpecialties = (hospitalId) =>
  doctorAssignmentService.getAvailableSpecialties(hospitalId);