import { db } from '../database-enhanced.js';

/**
 * Analytics Service
 * Provides aggregate queries for dashboard metrics and reports
 */

/**
 * Get overall system statistics
 */
export const getSystemStats = () => {
  return new Promise((resolve, reject) => {
    const stats = {};

    db.get(`
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN status = 'Created' OR status = 'Processing' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'InTreatment' THEN 1 END) as in_treatment,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed
      FROM patient_reports
      WHERE DATE(created_at) = DATE('now')
    `, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      stats.today = row;

      // Get hospital capacity stats
      db.all(`
        SELECT 
          h.hospital_id,
          h.name,
          h.capacity,
          h.current_load,
          ROUND((CAST(h.current_load AS FLOAT) / h.capacity) * 100, 2) as capacity_percentage,
          COUNT(pq.id) as queue_length
        FROM hospitals h
        LEFT JOIN patient_queue pq ON h.hospital_id = pq.hospital_id AND pq.queue_status = 'waiting'
        WHERE h.is_active = 1
        GROUP BY h.hospital_id
      `, (err, hospitals) => {
        if (err) {
          reject(err);
          return;
        }

        stats.hospitals = hospitals;
        resolve(stats);
      });
    });
  });
};

/**
 * Get average wait times by criticality
 */
export const getWaitTimesByPriority = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        tr.criticality,
        COUNT(*) as patient_count,
        AVG(
          (JULIANDAY(COALESCE(pr.doctor_assigned_at, pr.updated_at)) - JULIANDAY(pr.created_at)) * 24 * 60
        ) as avg_wait_minutes,
        MIN(
          (JULIANDAY(COALESCE(pr.doctor_assigned_at, pr.updated_at)) - JULIANDAY(pr.created_at)) * 24 * 60
        ) as min_wait_minutes,
        MAX(
          (JULIANDAY(COALESCE(pr.doctor_assigned_at, pr.updated_at)) - JULIANDAY(pr.created_at)) * 24 * 60
        ) as max_wait_minutes
      FROM patient_reports pr
      LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
      WHERE DATE(pr.created_at) >= DATE('now', '-7 days')
        AND pr.status IN ('Assigned', 'InTreatment', 'Completed')
      GROUP BY tr.criticality
      ORDER BY 
        CASE tr.criticality
          WHEN 'severe' THEN 1
          WHEN 'high' THEN 2
          WHEN 'moderate' THEN 3
          WHEN 'low' THEN 4
        END
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get hourly patient arrivals (last 24 hours)
 */
export const getHourlyArrivals = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count,
        COUNT(CASE WHEN tr.criticality = 'severe' THEN 1 END) as severe_count,
        COUNT(CASE WHEN tr.criticality = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN tr.criticality = 'moderate' THEN 1 END) as moderate_count,
        COUNT(CASE WHEN tr.criticality = 'low' THEN 1 END) as low_count
      FROM patient_reports pr
      LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
      WHERE datetime(pr.created_at) >= datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Fill in missing hours with 0
        const result = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: 0,
          severe_count: 0,
          high_count: 0,
          moderate_count: 0,
          low_count: 0
        }));

        rows.forEach(row => {
          result[row.hour] = row;
        });

        resolve(result);
      }
    });
  });
};

/**
 * Get incident type distribution
 */
export const getIncidentDistribution = (days = 7) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        incident_type,
        COUNT(*) as count,
        ROUND((CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) FROM patient_reports WHERE DATE(created_at) >= DATE('now', '-${days} days'))) * 100, 2) as percentage
      FROM patient_reports
      WHERE DATE(created_at) >= DATE('now', '-${days} days')
      GROUP BY incident_type
      ORDER BY count DESC
      LIMIT 10
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get doctor performance metrics
 */
export const getDoctorPerformance = (hospitalId = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        ds.doctor_id,
        ds.doctor_name,
        ds.hospital_id,
        h.name as hospital_name,
        ds.specialties,
        COUNT(pr.id) as total_patients,
        ds.current_patient_count,
        ds.max_concurrent_patients,
        AVG(
          (JULIANDAY(pr.doctor_released_at) - JULIANDAY(pr.doctor_assigned_at)) * 24 * 60
        ) as avg_treatment_minutes
      FROM doctor_shifts ds
      LEFT JOIN hospitals h ON ds.hospital_id = h.hospital_id
      LEFT JOIN patient_reports pr ON ds.doctor_id = pr.assigned_doctor_id
        AND DATE(pr.doctor_assigned_at) = DATE('now')
      WHERE ds.is_available = 1
    `;

    const params = [];
    if (hospitalId) {
      sql += ' AND ds.hospital_id = ?';
      params.push(hospitalId);
    }

    sql += `
      GROUP BY ds.doctor_id
      ORDER BY total_patients DESC
    `;

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          specialties: row.specialties ? JSON.parse(row.specialties) : [],
          utilization: (row.current_patient_count / row.max_concurrent_patients * 100).toFixed(2)
        })));
      }
    });
  });
};

/**
 * Get daily trends (last 30 days)
 */
export const getDailyTrends = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_patients,
        COUNT(CASE WHEN tr.criticality = 'severe' THEN 1 END) as severe,
        COUNT(CASE WHEN tr.criticality = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN tr.criticality = 'moderate' THEN 1 END) as moderate,
        COUNT(CASE WHEN tr.criticality = 'low' THEN 1 END) as low,
        AVG(
          CASE WHEN pr.doctor_assigned_at IS NOT NULL
          THEN (JULIANDAY(pr.doctor_assigned_at) - JULIANDAY(pr.created_at)) * 24 * 60
          END
        ) as avg_wait_minutes
      FROM patient_reports pr
      LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
      WHERE DATE(pr.created_at) >= DATE('now', '-30 days')
      GROUP BY DATE(pr.created_at)
      ORDER BY date
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get treatment outcomes summary
 */
export const getTreatmentOutcomes = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        treatment_outcome,
        COUNT(*) as count,
        AVG(treatment_duration_minutes) as avg_duration,
        AVG(patient_satisfaction_rating) as avg_satisfaction,
        COUNT(CASE WHEN follow_up_required = 1 THEN 1 END) as follow_up_required
      FROM treated_patients
      WHERE DATE(treatment_completed_at) >= DATE('now', '-30 days')
      GROUP BY treatment_outcome
      ORDER BY count DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get hospital queue comparison
 */
export const getHospitalQueueComparison = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        h.hospital_id,
        h.name,
        COUNT(pq.id) as queue_length,
        AVG(pq.estimated_wait_time) as avg_wait_time,
        COUNT(CASE WHEN tr.criticality = 'severe' THEN 1 END) as severe_patients,
        COUNT(CASE WHEN tr.criticality = 'high' THEN 1 END) as high_patients
      FROM hospitals h
      LEFT JOIN patient_queue pq ON h.hospital_id = pq.hospital_id AND pq.queue_status = 'waiting'
      LEFT JOIN patient_reports pr ON pq.report_id = pr.report_id
      LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
      WHERE h.is_active = 1
      GROUP BY h.hospital_id
      ORDER BY queue_length DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get peak hours analysis
 */
export const getPeakHoursAnalysis = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        strftime('%w', created_at) as day_of_week,
        COUNT(*) as patient_count,
        AVG(CASE WHEN tr.criticality IN ('severe', 'high') THEN 1 ELSE 0 END) as critical_ratio
      FROM patient_reports pr
      LEFT JOIN triage_results tr ON pr.report_id = tr.report_id
      WHERE DATE(pr.created_at) >= DATE('now', '-30 days')
      GROUP BY hour, day_of_week
      ORDER BY patient_count DESC
      LIMIT 20
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        resolve(rows.map(row => ({
          ...row,
          day_name: dayNames[row.day_of_week],
          hour_formatted: `${row.hour}:00`
        })));
      }
    });
  });
};

export default {
  getSystemStats,
  getWaitTimesByPriority,
  getHourlyArrivals,
  getIncidentDistribution,
  getDoctorPerformance,
  getDailyTrends,
  getTreatmentOutcomes,
  getHospitalQueueComparison,
  getPeakHoursAnalysis
};
