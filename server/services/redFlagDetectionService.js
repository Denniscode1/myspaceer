/**
 * Red Flag Detection Service
 * 
 * Identifies critical conditions and dangerous vital signs that require
 * immediate medical attention and clinical review.
 * 
 * Red flags trigger:
 * - Immediate notifications to medical staff
 * - Clinical review requirements
 * - Enhanced monitoring protocols
 * - Automatic escalation procedures
 */

import { MedicalError, ErrorCodes } from './errorHandlerService.js';

// ============================================================================
// RED FLAG CRITERIA
// ============================================================================

const RED_FLAG_THRESHOLDS = {
  // Critical vital signs
  vitalSigns: {
    heartRate: {
      critical_low: 40,
      critical_high: 180,
      warning_low: 50,
      warning_high: 140,
    },
    systolicBP: {
      critical_low: 70,
      critical_high: 220,
      warning_low: 90,
      warning_high: 180,
    },
    diastolicBP: {
      critical_low: 40,
      critical_high: 130,
      warning_low: 60,
      warning_high: 110,
    },
    respiratoryRate: {
      critical_low: 8,
      critical_high: 35,
      warning_low: 10,
      warning_high: 28,
    },
    oxygenSaturation: {
      critical: 85,
      warning: 90,
    },
    temperature: {
      critical_low: 35,
      critical_high: 41,
      warning_low: 35.5,
      warning_high: 39.5,
    },
  },

  // Dangerous combinations
  combinedFlags: {
    shock: {
      // Hypotension + tachycardia = possible shock
      systolic_bp_max: 90,
      heart_rate_min: 110,
    },
    respiratoryDistress: {
      // Low O2 + high RR = respiratory distress
      oxygen_sat_max: 90,
      respiratory_rate_min: 25,
    },
    sepsis: {
      // Fever + tachycardia + hypotension = possible sepsis
      temperature_min: 38.3,
      heart_rate_min: 90,
      systolic_bp_max: 100,
    },
  },

  // Critical pain levels
  pain: {
    severe: 8, // Pain >= 8 is severe
    moderate: 5, // Pain >= 5 is moderate
  },
};

// Dangerous patient statuses
const CRITICAL_STATUSES = [
  'unresponsive',
  'severe-respiratory-distress',
  'cardiac-arrest',
  'respiratory-arrest',
  'active-seizure',
  'major-trauma',
];

// High-risk incidents
const HIGH_RISK_INCIDENTS = [
  'motor-vehicle-accident',
  'fall',
  'assault',
  'gunshot-wound',
  'stabbing',
  'industrial-accident',
  'fire',
  'drowning',
];

// ============================================================================
// RED FLAG DETECTION ENGINE
// ============================================================================

class RedFlagDetectionService {
  /**
   * Detect all red flags in patient data
   * @param {Object} patientData - Patient report data
   * @returns {Object} Red flag detection result
   */
  static detectRedFlags(patientData) {
    try {
      const redFlags = [];

      // Check vital signs
      if (patientData.vital_signs) {
        const vsFlags = this.checkVitalSigns(patientData.vital_signs);
        redFlags.push(...vsFlags);
      }

      // Check for dangerous combinations
      if (patientData.vital_signs) {
        const combinedFlags = this.checkDangerousCombinations(patientData.vital_signs);
        redFlags.push(...combinedFlags);
      }

      // Check patient status
      const statusFlags = this.checkPatientStatus(patientData.patient_status);
      redFlags.push(...statusFlags);

      // Check incident type
      const incidentFlags = this.checkIncidentType(patientData.incident_type);
      redFlags.push(...incidentFlags);

      // Check pain level
      if (patientData.pain_score !== undefined && patientData.pain_score !== null) {
        const painFlags = this.checkPainLevel(patientData.pain_score);
        redFlags.push(...painFlags);
      }

      // Check for pediatric/geriatric patients
      const ageFlags = this.checkAgeRelatedRisks(patientData.age_range, redFlags);
      redFlags.push(...ageFlags);

      // Categorize red flags by severity
      const categorized = this.categorizeRedFlags(redFlags);

      return {
        hasRedFlags: redFlags.length > 0,
        criticalCount: categorized.critical.length,
        warningCount: categorized.warning.length,
        redFlags: redFlags,
        categorized: categorized,
        requiresImmediateAttention: categorized.critical.length > 0,
        requiresClinicalReview: redFlags.length > 0,
        summary: this.generateRedFlagSummary(categorized),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new MedicalError(
        'Red flag detection failed',
        ErrorCodes.RED_FLAG_DETECTION_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Check vital signs for red flags
   */
  static checkVitalSigns(vitalSigns) {
    const flags = [];
    const thresholds = RED_FLAG_THRESHOLDS.vitalSigns;

    // Heart Rate
    if (vitalSigns.heart_rate !== undefined && vitalSigns.heart_rate !== null) {
      if (vitalSigns.heart_rate < thresholds.heartRate.critical_low) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Heart Rate',
          value: vitalSigns.heart_rate,
          unit: 'bpm',
          threshold: `< ${thresholds.heartRate.critical_low}`,
          message: 'Severe bradycardia - immediate intervention required',
          clinicalSignificance: 'Risk of cardiac arrest, syncope, or organ hypoperfusion',
          immediateActions: [
            'Check airway, breathing, circulation',
            'Consider atropine or pacing',
            'Continuous cardiac monitoring',
          ],
        });
      } else if (vitalSigns.heart_rate > thresholds.heartRate.critical_high) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Heart Rate',
          value: vitalSigns.heart_rate,
          unit: 'bpm',
          threshold: `> ${thresholds.heartRate.critical_high}`,
          message: 'Severe tachycardia - immediate intervention required',
          clinicalSignificance: 'Risk of hemodynamic instability, ischemia, or arrhythmia',
          immediateActions: [
            'Assess hemodynamic stability',
            'Consider cardioversion if unstable',
            'Identify and treat underlying cause',
          ],
        });
      } else if (vitalSigns.heart_rate < thresholds.heartRate.warning_low ||
                 vitalSigns.heart_rate > thresholds.heartRate.warning_high) {
        flags.push({
          type: 'WARNING',
          category: 'VITAL_SIGNS',
          parameter: 'Heart Rate',
          value: vitalSigns.heart_rate,
          unit: 'bpm',
          threshold: `${thresholds.heartRate.warning_low}-${thresholds.heartRate.warning_high}`,
          message: 'Abnormal heart rate - requires monitoring',
          clinicalSignificance: 'Potential cardiac or systemic issue',
        });
      }
    }

    // Blood Pressure - Systolic
    if (vitalSigns.systolic_bp !== undefined && vitalSigns.systolic_bp !== null) {
      if (vitalSigns.systolic_bp < thresholds.systolicBP.critical_low) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Systolic Blood Pressure',
          value: vitalSigns.systolic_bp,
          unit: 'mmHg',
          threshold: `< ${thresholds.systolicBP.critical_low}`,
          message: 'Severe hypotension - shock protocol',
          clinicalSignificance: 'Risk of organ hypoperfusion and failure',
          immediateActions: [
            'IV fluid resuscitation',
            'Identify source of shock',
            'Consider vasopressors',
            'Frequent vital signs monitoring',
          ],
        });
      } else if (vitalSigns.systolic_bp > thresholds.systolicBP.critical_high) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Systolic Blood Pressure',
          value: vitalSigns.systolic_bp,
          unit: 'mmHg',
          threshold: `> ${thresholds.systolicBP.critical_high}`,
          message: 'Severe hypertension - hypertensive emergency',
          clinicalSignificance: 'Risk of stroke, MI, aortic dissection, or end-organ damage',
          immediateActions: [
            'Assess for end-organ damage',
            'Consider IV antihypertensives',
            'Rule out life-threatening causes',
          ],
        });
      } else if (vitalSigns.systolic_bp < thresholds.systolicBP.warning_low ||
                 vitalSigns.systolic_bp > thresholds.systolicBP.warning_high) {
        flags.push({
          type: 'WARNING',
          category: 'VITAL_SIGNS',
          parameter: 'Systolic Blood Pressure',
          value: vitalSigns.systolic_bp,
          unit: 'mmHg',
          threshold: `${thresholds.systolicBP.warning_low}-${thresholds.systolicBP.warning_high}`,
          message: 'Abnormal blood pressure - requires monitoring',
        });
      }
    }

    // Respiratory Rate
    if (vitalSigns.respiratory_rate !== undefined && vitalSigns.respiratory_rate !== null) {
      if (vitalSigns.respiratory_rate < thresholds.respiratoryRate.critical_low) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Respiratory Rate',
          value: vitalSigns.respiratory_rate,
          unit: 'breaths/min',
          threshold: `< ${thresholds.respiratoryRate.critical_low}`,
          message: 'Severe bradypnea - respiratory failure risk',
          clinicalSignificance: 'Risk of hypoxia, hypercarbia, and respiratory arrest',
          immediateActions: [
            'Assess airway patency',
            'Provide supplemental oxygen',
            'Consider assisted ventilation',
            'Check for opiate overdose',
          ],
        });
      } else if (vitalSigns.respiratory_rate > thresholds.respiratoryRate.critical_high) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Respiratory Rate',
          value: vitalSigns.respiratory_rate,
          unit: 'breaths/min',
          threshold: `> ${thresholds.respiratoryRate.critical_high}`,
          message: 'Severe tachypnea - respiratory distress',
          clinicalSignificance: 'Indicates severe hypoxia, acidosis, or respiratory compromise',
          immediateActions: [
            'Provide high-flow oxygen',
            'Assess work of breathing',
            'Consider respiratory support',
            'Identify underlying cause',
          ],
        });
      } else if (vitalSigns.respiratory_rate < thresholds.respiratoryRate.warning_low ||
                 vitalSigns.respiratory_rate > thresholds.respiratoryRate.warning_high) {
        flags.push({
          type: 'WARNING',
          category: 'VITAL_SIGNS',
          parameter: 'Respiratory Rate',
          value: vitalSigns.respiratory_rate,
          unit: 'breaths/min',
          threshold: `${thresholds.respiratoryRate.warning_low}-${thresholds.respiratoryRate.warning_high}`,
          message: 'Abnormal respiratory rate - requires monitoring',
        });
      }
    }

    // Oxygen Saturation
    if (vitalSigns.oxygen_saturation !== undefined && vitalSigns.oxygen_saturation !== null) {
      if (vitalSigns.oxygen_saturation < thresholds.oxygenSaturation.critical) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Oxygen Saturation',
          value: vitalSigns.oxygen_saturation,
          unit: '%',
          threshold: `< ${thresholds.oxygenSaturation.critical}`,
          message: 'Critical hypoxemia - immediate oxygen therapy',
          clinicalSignificance: 'Severe tissue hypoxia, risk of organ damage',
          immediateActions: [
            'Immediate high-flow oxygen',
            'Assess airway and breathing',
            'Consider non-invasive ventilation',
            'Prepare for intubation if necessary',
          ],
        });
      } else if (vitalSigns.oxygen_saturation < thresholds.oxygenSaturation.warning) {
        flags.push({
          type: 'WARNING',
          category: 'VITAL_SIGNS',
          parameter: 'Oxygen Saturation',
          value: vitalSigns.oxygen_saturation,
          unit: '%',
          threshold: `< ${thresholds.oxygenSaturation.warning}`,
          message: 'Low oxygen saturation - supplemental oxygen required',
        });
      }
    }

    // Temperature
    if (vitalSigns.temperature !== undefined && vitalSigns.temperature !== null) {
      if (vitalSigns.temperature < thresholds.temperature.critical_low) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Temperature',
          value: vitalSigns.temperature,
          unit: '°C',
          threshold: `< ${thresholds.temperature.critical_low}`,
          message: 'Severe hypothermia',
          clinicalSignificance: 'Risk of cardiac arrhythmias and organ dysfunction',
          immediateActions: [
            'Active rewarming',
            'Cardiac monitoring',
            'Check core temperature',
          ],
        });
      } else if (vitalSigns.temperature > thresholds.temperature.critical_high) {
        flags.push({
          type: 'CRITICAL',
          category: 'VITAL_SIGNS',
          parameter: 'Temperature',
          value: vitalSigns.temperature,
          unit: '°C',
          threshold: `> ${thresholds.temperature.critical_high}`,
          message: 'Severe hyperthermia',
          clinicalSignificance: 'Risk of heat stroke and organ damage',
          immediateActions: [
            'Active cooling measures',
            'IV fluid resuscitation',
            'Monitor for rhabdomyolysis',
          ],
        });
      } else if (vitalSigns.temperature < thresholds.temperature.warning_low ||
                 vitalSigns.temperature > thresholds.temperature.warning_high) {
        flags.push({
          type: 'WARNING',
          category: 'VITAL_SIGNS',
          parameter: 'Temperature',
          value: vitalSigns.temperature,
          unit: '°C',
          threshold: `${thresholds.temperature.warning_low}-${thresholds.temperature.warning_high}`,
          message: 'Abnormal temperature - requires monitoring',
        });
      }
    }

    return flags;
  }

  /**
   * Check for dangerous vital sign combinations
   */
  static checkDangerousCombinations(vitalSigns) {
    const flags = [];
    const combined = RED_FLAG_THRESHOLDS.combinedFlags;

    // Check for shock (hypotension + tachycardia)
    if (vitalSigns.systolic_bp && vitalSigns.heart_rate) {
      if (vitalSigns.systolic_bp <= combined.shock.systolic_bp_max &&
          vitalSigns.heart_rate >= combined.shock.heart_rate_min) {
        flags.push({
          type: 'CRITICAL',
          category: 'COMBINED_FLAGS',
          parameter: 'Shock Index',
          message: 'Possible shock state detected',
          clinicalSignificance: 'Hypotension + tachycardia suggests hypovolemic, cardiogenic, or septic shock',
          values: {
            systolic_bp: vitalSigns.systolic_bp,
            heart_rate: vitalSigns.heart_rate,
          },
          immediateActions: [
            'Initiate shock protocol',
            'IV fluid bolus',
            'Identify shock type',
            'Consider vasopressors',
            'Serial lactate measurements',
          ],
        });
      }
    }

    // Check for respiratory distress
    if (vitalSigns.oxygen_saturation && vitalSigns.respiratory_rate) {
      if (vitalSigns.oxygen_saturation <= combined.respiratoryDistress.oxygen_sat_max &&
          vitalSigns.respiratory_rate >= combined.respiratoryDistress.respiratory_rate_min) {
        flags.push({
          type: 'CRITICAL',
          category: 'COMBINED_FLAGS',
          parameter: 'Respiratory Distress',
          message: 'Severe respiratory distress detected',
          clinicalSignificance: 'Low O2 + high RR indicates respiratory failure',
          values: {
            oxygen_saturation: vitalSigns.oxygen_saturation,
            respiratory_rate: vitalSigns.respiratory_rate,
          },
          immediateActions: [
            'High-flow oxygen immediately',
            'Assess for airway obstruction',
            'Consider non-invasive ventilation',
            'Prepare for intubation',
          ],
        });
      }
    }

    // Check for sepsis criteria
    if (vitalSigns.temperature && vitalSigns.heart_rate && vitalSigns.systolic_bp) {
      if (vitalSigns.temperature >= combined.sepsis.temperature_min &&
          vitalSigns.heart_rate >= combined.sepsis.heart_rate_min &&
          vitalSigns.systolic_bp <= combined.sepsis.systolic_bp_max) {
        flags.push({
          type: 'CRITICAL',
          category: 'COMBINED_FLAGS',
          parameter: 'Sepsis Criteria',
          message: 'Possible sepsis/septic shock',
          clinicalSignificance: 'Fever + tachycardia + hypotension meets sepsis criteria',
          values: {
            temperature: vitalSigns.temperature,
            heart_rate: vitalSigns.heart_rate,
            systolic_bp: vitalSigns.systolic_bp,
          },
          immediateActions: [
            'Initiate sepsis bundle',
            'Blood cultures before antibiotics',
            'Broad-spectrum antibiotics within 1 hour',
            'IV fluid resuscitation (30ml/kg)',
            'Serial lactate measurements',
          ],
        });
      }
    }

    return flags;
  }

  /**
   * Check patient status for red flags
   */
  static checkPatientStatus(patientStatus) {
    const flags = [];

    if (CRITICAL_STATUSES.includes(patientStatus)) {
      flags.push({
        type: 'CRITICAL',
        category: 'PATIENT_STATUS',
        parameter: 'Patient Status',
        value: patientStatus,
        message: `Critical patient status: ${patientStatus}`,
        clinicalSignificance: 'Life-threatening condition requiring immediate intervention',
        immediateActions: [
          'Activate emergency response team',
          'Prepare resuscitation equipment',
          'Notify attending physician immediately',
        ],
      });
    }

    return flags;
  }

  /**
   * Check incident type for red flags
   */
  static checkIncidentType(incidentType) {
    const flags = [];

    if (HIGH_RISK_INCIDENTS.includes(incidentType)) {
      flags.push({
        type: 'WARNING',
        category: 'INCIDENT_TYPE',
        parameter: 'Incident Type',
        value: incidentType,
        message: `High-risk incident: ${incidentType}`,
        clinicalSignificance: 'Mechanism suggests potential for serious injury',
        recommendedActions: [
          'Trauma assessment protocol',
          'Consider imaging studies',
          'Monitor for delayed complications',
        ],
      });
    }

    return flags;
  }

  /**
   * Check pain level for red flags
   */
  static checkPainLevel(painScore) {
    const flags = [];

    if (painScore >= RED_FLAG_THRESHOLDS.pain.severe) {
      flags.push({
        type: 'WARNING',
        category: 'PAIN',
        parameter: 'Pain Score',
        value: painScore,
        unit: '/10',
        threshold: `>= ${RED_FLAG_THRESHOLDS.pain.severe}`,
        message: 'Severe pain reported',
        clinicalSignificance: 'High pain level requiring prompt management',
        recommendedActions: [
          'Prompt pain assessment',
          'Consider analgesics',
          'Investigate pain source',
        ],
      });
    }

    return flags;
  }

  /**
   * Check for age-related risk factors
   */
  static checkAgeRelatedRisks(ageRange, existingFlags) {
    const flags = [];

    // Pediatric patients
    if (ageRange === '0-18' && existingFlags.length > 0) {
      flags.push({
        type: 'WARNING',
        category: 'AGE_RELATED',
        parameter: 'Pediatric Patient',
        message: 'Pediatric patient with red flags',
        clinicalSignificance: 'Children compensate longer but decompensate faster',
        recommendedActions: [
          'Use pediatric-adjusted thresholds',
          'Consider early pediatric consultation',
          'Monitor closely for deterioration',
        ],
      });
    }

    // Geriatric patients
    if (ageRange === '71+' && existingFlags.length > 0) {
      flags.push({
        type: 'WARNING',
        category: 'AGE_RELATED',
        parameter: 'Geriatric Patient',
        message: 'Geriatric patient with red flags',
        clinicalSignificance: 'Elderly patients have less physiologic reserve',
        recommendedActions: [
          'Consider baseline functional status',
          'Review medications',
          'Lower threshold for admission',
        ],
      });
    }

    return flags;
  }

  /**
   * Categorize red flags by severity
   */
  static categorizeRedFlags(redFlags) {
    return {
      critical: redFlags.filter(flag => flag.type === 'CRITICAL'),
      warning: redFlags.filter(flag => flag.type === 'WARNING'),
    };
  }

  /**
   * Generate human-readable summary
   */
  static generateRedFlagSummary(categorized) {
    if (categorized.critical.length === 0 && categorized.warning.length === 0) {
      return 'No red flags detected';
    }

    const parts = [];
    
    if (categorized.critical.length > 0) {
      parts.push(`${categorized.critical.length} CRITICAL red flag(s) requiring immediate attention`);
    }
    
    if (categorized.warning.length > 0) {
      parts.push(`${categorized.warning.length} WARNING red flag(s) requiring monitoring`);
    }

    return parts.join('; ');
  }
}

export default RedFlagDetectionService;
