/**
 * Clinical Oversight Service
 * 
 * Integrates all clinical safety features:
 * - ESI triage calculation
 * - Red flag detection
 * - Clinical validation
 * - Decision support
 * - Medical staff alerts
 * 
 * This service ensures all patient reports are clinically validated
 * and provides appropriate guidance for medical staff.
 */

import ESITriageEngine from './esiTriageEngine.js';
import RedFlagDetectionService from './redFlagDetectionService.js';
import { MedicalError, ErrorCodes } from './errorHandlerService.js';

class ClinicalOversightService {
  /**
   * Perform comprehensive clinical assessment
   * @param {Object} patientData - Patient report data
   * @returns {Object} Complete clinical assessment
   */
  static async performClinicalAssessment(patientData) {
    try {
      // Step 1: Calculate ESI triage level
      const esiResult = ESITriageEngine.calculateESI(patientData);
      
      // Step 2: Detect red flags
      const redFlagResult = RedFlagDetectionService.detectRedFlags(patientData);
      
      // Step 3: Validate ESI result against red flags
      const validatedESI = ESITriageEngine.validateESIResult(esiResult, patientData);
      
      // Step 4: Generate clinical recommendations
      const clinicalRecommendations = this.generateClinicalRecommendations(
        validatedESI,
        redFlagResult,
        patientData
      );
      
      // Step 5: Determine notification urgency
      const notificationPriority = this.determineNotificationPriority(
        validatedESI,
        redFlagResult
      );
      
      // Step 6: Generate clinical summary
      const clinicalSummary = this.generateClinicalSummary(
        validatedESI,
        redFlagResult,
        patientData
      );

      return {
        // ESI Triage
        esi: validatedESI,
        
        // Red Flags
        redFlags: redFlagResult,
        
        // Clinical Guidance
        clinicalRecommendations,
        notificationPriority,
        clinicalSummary,
        
        // Safety Checks
        requiresImmediateAttention: 
          validatedESI.esiLevel <= 2 || redFlagResult.requiresImmediateAttention,
        requiresClinicalReview: 
          validatedESI.requiresClinicalReview || redFlagResult.requiresClinicalReview,
        
        // Metadata
        timestamp: new Date().toISOString(),
        assessmentVersion: '1.0',
      };
    } catch (error) {
      throw new MedicalError(
        'Clinical assessment failed',
        ErrorCodes.CLINICAL_ASSESSMENT_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Generate clinical recommendations based on assessment
   */
  static generateClinicalRecommendations(esiResult, redFlagResult, patientData) {
    const recommendations = {
      immediate: [],
      monitoring: [],
      investigations: [],
      consultations: [],
      disposition: [],
    };

    // Immediate actions from ESI
    if (esiResult.recommendations) {
      recommendations.immediate.push(...esiResult.recommendations);
    }

    // Immediate actions from red flags
    if (redFlagResult.categorized?.critical) {
      redFlagResult.categorized.critical.forEach(flag => {
        if (flag.immediateActions) {
          recommendations.immediate.push(...flag.immediateActions);
        }
      });
    }

    // Monitoring recommendations
    recommendations.monitoring.push(`Monitor vital signs every ${this.getMonitoringInterval(esiResult.esiLevel)} minutes`);
    
    if (esiResult.esiLevel <= 2) {
      recommendations.monitoring.push('Continuous cardiac monitoring');
      recommendations.monitoring.push('Pulse oximetry');
    }

    if (redFlagResult.categorized?.warning) {
      redFlagResult.categorized.warning.forEach(flag => {
        if (flag.recommendedActions) {
          recommendations.monitoring.push(...flag.recommendedActions);
        }
      });
    }

    // Investigation recommendations
    if (esiResult.estimatedResources) {
      recommendations.investigations.push(...esiResult.estimatedResources);
    }

    // Add standard investigations for ESI 1-2
    if (esiResult.esiLevel === 1) {
      recommendations.investigations.push(
        'Stat labs (CBC, CMP, coags)',
        'ECG',
        'Chest X-ray',
        'Blood cultures if febrile',
        'Arterial blood gas if respiratory distress'
      );
    } else if (esiResult.esiLevel === 2) {
      recommendations.investigations.push(
        'Basic labs (CBC, BMP)',
        'ECG if cardiac symptoms',
        'Imaging as indicated'
      );
    }

    // Consultation recommendations
    if (esiResult.esiLevel === 1) {
      recommendations.consultations.push('Immediate physician evaluation');
      recommendations.consultations.push('Consider ICU consultation');
    } else if (esiResult.esiLevel === 2) {
      recommendations.consultations.push('Urgent physician evaluation');
    }

    // Check for specialist consultations based on red flags
    if (redFlagResult.hasRedFlags) {
      const categories = redFlagResult.redFlags.map(f => f.category);
      
      if (categories.includes('COMBINED_FLAGS')) {
        const params = redFlagResult.redFlags
          .filter(f => f.category === 'COMBINED_FLAGS')
          .map(f => f.parameter);
        
        if (params.includes('Shock Index')) {
          recommendations.consultations.push('Critical care consultation');
        }
        if (params.includes('Sepsis Criteria')) {
          recommendations.consultations.push('Infectious disease consultation');
        }
        if (params.includes('Respiratory Distress')) {
          recommendations.consultations.push('Pulmonology/Critical care consultation');
        }
      }
    }

    // Disposition recommendations
    if (esiResult.esiLevel === 1) {
      recommendations.disposition.push('Resuscitation bay');
      recommendations.disposition.push('Prepare for ICU admission');
    } else if (esiResult.esiLevel === 2) {
      recommendations.disposition.push('Acute care area');
      recommendations.disposition.push('Likely admission');
    } else if (esiResult.esiLevel === 3) {
      recommendations.disposition.push('ED bed');
      recommendations.disposition.push('Possible admission');
    } else {
      recommendations.disposition.push('Fast track or waiting area');
      recommendations.disposition.push('Likely discharge');
    }

    // Remove duplicates
    Object.keys(recommendations).forEach(key => {
      recommendations[key] = [...new Set(recommendations[key])];
    });

    return recommendations;
  }

  /**
   * Determine notification priority for medical staff
   */
  static determineNotificationPriority(esiResult, redFlagResult) {
    let priority = 'ROUTINE';
    let urgency = 'normal';
    let channels = ['in-app'];

    // ESI Level 1 - CRITICAL
    if (esiResult.esiLevel === 1) {
      priority = 'CRITICAL';
      urgency = 'immediate';
      channels = ['sms', 'push', 'email', 'in-app'];
    }
    // ESI Level 2 or Critical Red Flags - URGENT
    else if (esiResult.esiLevel === 2 || redFlagResult.criticalCount > 0) {
      priority = 'URGENT';
      urgency = 'high';
      channels = ['sms', 'push', 'in-app'];
    }
    // ESI Level 3 or Warning Red Flags - HIGH
    else if (esiResult.esiLevel === 3 || redFlagResult.warningCount > 0) {
      priority = 'HIGH';
      urgency = 'elevated';
      channels = ['push', 'in-app'];
    }
    // ESI Level 4-5 - ROUTINE
    else {
      priority = 'ROUTINE';
      urgency = 'normal';
      channels = ['in-app'];
    }

    return {
      priority,
      urgency,
      channels,
      requiresAcknowledgment: priority === 'CRITICAL' || priority === 'URGENT',
      escalationTimeMinutes: priority === 'CRITICAL' ? 5 : priority === 'URGENT' ? 15 : 30,
    };
  }

  /**
   * Generate human-readable clinical summary
   */
  static generateClinicalSummary(esiResult, redFlagResult, patientData) {
    const lines = [];

    // Patient demographics
    lines.push(`Patient: ${patientData.age_range} year old ${patientData.gender}`);
    
    // Chief complaint
    lines.push(`Incident: ${patientData.incident_type}`);
    
    // ESI Level
    lines.push(`ESI Level: ${esiResult.esiLevel} (${esiResult.category})`);
    lines.push(`Priority: ${esiResult.priority}`);
    
    // Vital signs summary
    if (patientData.vital_signs) {
      const vs = patientData.vital_signs;
      const vsSummary = [];
      
      if (vs.systolic_bp && vs.diastolic_bp) {
        vsSummary.push(`BP ${vs.systolic_bp}/${vs.diastolic_bp}`);
      }
      if (vs.heart_rate) {
        vsSummary.push(`HR ${vs.heart_rate}`);
      }
      if (vs.respiratory_rate) {
        vsSummary.push(`RR ${vs.respiratory_rate}`);
      }
      if (vs.oxygen_saturation) {
        vsSummary.push(`SpO2 ${vs.oxygen_saturation}%`);
      }
      if (vs.temperature) {
        vsSummary.push(`Temp ${vs.temperature}°C`);
      }
      
      lines.push(`Vital Signs: ${vsSummary.join(', ')}`);
    }

    // Pain score
    if (patientData.pain_score !== undefined && patientData.pain_score !== null) {
      lines.push(`Pain: ${patientData.pain_score}/10`);
    }

    // Red flags summary
    if (redFlagResult.hasRedFlags) {
      lines.push(`\n⚠️ RED FLAGS (${redFlagResult.criticalCount} critical, ${redFlagResult.warningCount} warning):`);
      
      // Critical flags
      if (redFlagResult.categorized.critical.length > 0) {
        lines.push('\nCRITICAL:');
        redFlagResult.categorized.critical.forEach(flag => {
          lines.push(`  • ${flag.message}`);
        });
      }
      
      // Warning flags (only show first 3)
      if (redFlagResult.categorized.warning.length > 0) {
        lines.push('\nWARNINGS:');
        redFlagResult.categorized.warning.slice(0, 3).forEach(flag => {
          lines.push(`  • ${flag.message}`);
        });
        if (redFlagResult.categorized.warning.length > 3) {
          lines.push(`  • ... and ${redFlagResult.categorized.warning.length - 3} more`);
        }
      }
    } else {
      lines.push('\n✓ No red flags detected');
    }

    // Clinical reasoning
    if (esiResult.reasoning) {
      lines.push(`\nClinical Reasoning: ${esiResult.reasoning}`);
    }

    // Validation warnings
    if (esiResult.validationWarnings && esiResult.validationWarnings.length > 0) {
      lines.push(`\n⚠️ Clinical Review Required:`);
      esiResult.validationWarnings.forEach(warning => {
        lines.push(`  • ${warning}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get monitoring interval based on ESI level
   */
  static getMonitoringInterval(esiLevel) {
    const intervals = {
      1: 5,   // Every 5 minutes
      2: 15,  // Every 15 minutes
      3: 30,  // Every 30 minutes
      4: 60,  // Every hour
      5: 120, // Every 2 hours
    };
    return intervals[esiLevel] || 60;
  }

  /**
   * Validate clinical data completeness
   */
  static validateClinicalData(patientData) {
    const warnings = [];
    const missing = [];

    // Check for vital signs
    if (!patientData.vital_signs) {
      missing.push('Vital signs not provided');
    } else {
      const vs = patientData.vital_signs;
      if (!vs.heart_rate) missing.push('Heart rate');
      if (!vs.systolic_bp) missing.push('Blood pressure');
      if (!vs.respiratory_rate) missing.push('Respiratory rate');
      if (!vs.oxygen_saturation) missing.push('Oxygen saturation');
      if (!vs.temperature) missing.push('Temperature');
    }

    // Check for pain score
    if (patientData.pain_score === undefined || patientData.pain_score === null) {
      warnings.push('Pain score not documented');
    }

    // Check for allergies
    if (!patientData.allergies || !patientData.allergies.trim()) {
      warnings.push('Allergies not documented');
    }

    // Check for medical history
    if (!patientData.medical_history || !patientData.medical_history.trim()) {
      warnings.push('Medical history not documented');
    }

    return {
      isComplete: missing.length === 0,
      missing,
      warnings,
      completenessScore: this.calculateCompletenessScore(patientData),
    };
  }

  /**
   * Calculate data completeness score (0-100)
   */
  static calculateCompletenessScore(patientData) {
    let score = 0;
    const maxScore = 100;
    const weights = {
      vital_signs: 40,
      pain_score: 10,
      allergies: 10,
      medical_history: 10,
      incident_description: 15,
      contact_info: 10,
      consent: 5,
    };

    // Vital signs (40 points)
    if (patientData.vital_signs) {
      const vsFields = ['heart_rate', 'systolic_bp', 'diastolic_bp', 'respiratory_rate', 'oxygen_saturation', 'temperature'];
      const vsComplete = vsFields.filter(f => patientData.vital_signs[f] !== undefined && patientData.vital_signs[f] !== null).length;
      score += (vsComplete / vsFields.length) * weights.vital_signs;
    }

    // Pain score (10 points)
    if (patientData.pain_score !== undefined && patientData.pain_score !== null) {
      score += weights.pain_score;
    }

    // Allergies (10 points)
    if (patientData.allergies && patientData.allergies.trim()) {
      score += weights.allergies;
    }

    // Medical history (10 points)
    if (patientData.medical_history && patientData.medical_history.trim()) {
      score += weights.medical_history;
    }

    // Incident description (15 points)
    if (patientData.incident_description && patientData.incident_description.length >= 20) {
      score += weights.incident_description;
    }

    // Contact info (10 points)
    if (patientData.contact_email || patientData.contact_phone) {
      score += weights.contact_info;
    }

    // Consent (5 points)
    if (patientData.consent_data_storage && patientData.consent_communication) {
      score += weights.consent;
    }

    return Math.round(score);
  }

  /**
   * Generate clinical audit trail entry
   */
  static generateAuditEntry(assessmentResult, userId) {
    return {
      action: 'CLINICAL_ASSESSMENT',
      userId,
      timestamp: new Date().toISOString(),
      esiLevel: assessmentResult.esi.esiLevel,
      esiCategory: assessmentResult.esi.category,
      criticalRedFlags: assessmentResult.redFlags.criticalCount,
      warningRedFlags: assessmentResult.redFlags.warningCount,
      requiresImmediateAttention: assessmentResult.requiresImmediateAttention,
      notificationPriority: assessmentResult.notificationPriority.priority,
      assessmentVersion: assessmentResult.assessmentVersion,
    };
  }
}

export default ClinicalOversightService;
