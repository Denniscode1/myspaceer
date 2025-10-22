/**
 * ESI Triage Engine - Emergency Severity Index (v4)
 * 
 * Implements the 5-level Emergency Severity Index used by emergency departments
 * to prioritize patient care based on acuity and resource needs.
 * 
 * ESI Levels:
 * - Level 1: Immediate life-saving intervention required (Resuscitation)
 * - Level 2: High risk situation, confused/lethargic/disoriented, severe pain/distress
 * - Level 3: Stable, needs multiple resources (labs, imaging, procedures)
 * - Level 4: Stable, needs one resource
 * - Level 5: Stable, no resources needed
 * 
 * Reference: ESI Implementation Handbook, AHRQ
 */

import { MedicalError, ErrorCodes } from './errorHandlerService.js';

// ============================================================================
// ESI LEVEL 1 CRITERIA - IMMEDIATE LIFE-SAVING INTERVENTION
// ============================================================================

const LEVEL_1_CRITERIA = {
  vitalSigns: {
    // Critical vital sign thresholds
    heartRate: { min: 40, max: 180 },
    systolicBP: { min: 70, max: 220 },
    respiratoryRate: { min: 8, max: 35 },
    oxygenSaturation: { min: 85 },
    temperature: { min: 35, max: 41 },
  },
  
  conditions: [
    'unresponsive',
    'cardiac-arrest',
    'respiratory-arrest',
    'severe-respiratory-distress',
    'major-trauma',
    'active-seizure',
  ],
  
  keywords: [
    'unresponsive',
    'not breathing',
    'no pulse',
    'severe bleeding',
    'unconscious',
    'cyanotic',
    'apneic',
  ],
};

// ============================================================================
// ESI LEVEL 2 CRITERIA - HIGH RISK SITUATION
// ============================================================================

const LEVEL_2_CRITERIA = {
  vitalSigns: {
    heartRate: { min: 45, max: 150 },
    systolicBP: { min: 80, max: 200 },
    respiratoryRate: { min: 10, max: 30 },
    oxygenSaturation: { min: 88 },
    temperature: { min: 35.5, max: 40 },
  },
  
  highRiskSituations: [
    'altered-mental-status',
    'severe-pain',
    'chest-pain',
    'difficulty-breathing',
    'significant-bleeding',
    'suspected-stroke',
  ],
  
  keywords: [
    'confused',
    'lethargic',
    'chest pain',
    'difficulty breathing',
    'severe pain',
    'stroke',
    'head injury',
    'heavy bleeding',
  ],
};

// ============================================================================
// RESOURCE PREDICTION FOR ESI 3-5
// ============================================================================

const RESOURCE_PREDICTIONS = {
  // Conditions that typically require multiple resources (ESI 3)
  multipleResources: [
    'motor-vehicle-accident',
    'fall',
    'assault',
    'industrial-accident',
  ],
  
  // Conditions that typically require one resource (ESI 4)
  singleResource: [
    'minor-injury',
    'laceration',
    'sprain',
  ],
  
  // Conditions that require no resources (ESI 5)
  noResources: [
    'medication-refill',
    'minor-complaint',
  ],
};

// ============================================================================
// ESI CALCULATION ENGINE
// ============================================================================

class ESITriageEngine {
  /**
   * Calculate ESI level for a patient
   * @param {Object} patientData - Patient report data
   * @returns {Object} ESI result with level, reasoning, and recommendations
   */
  static calculateESI(patientData) {
    try {
      // Step 1: Check for Level 1 (immediate life-saving intervention)
      const level1Check = this.checkLevel1(patientData);
      if (level1Check.isLevel1) {
        return {
          esiLevel: 1,
          category: 'RESUSCITATION',
          priority: 'IMMEDIATE',
          maxWaitTime: 0,
          reasoning: level1Check.reasoning,
          redFlags: level1Check.redFlags,
          recommendations: [
            'Immediate resuscitation bay',
            'Activate emergency response team',
            'Continuous monitoring required',
            'Notify attending physician immediately',
          ],
          timestamp: new Date().toISOString(),
        };
      }

      // Step 2: Check for Level 2 (high risk situation)
      const level2Check = this.checkLevel2(patientData);
      if (level2Check.isLevel2) {
        return {
          esiLevel: 2,
          category: 'EMERGENT',
          priority: 'HIGH',
          maxWaitTime: 10, // minutes
          reasoning: level2Check.reasoning,
          redFlags: level2Check.redFlags,
          recommendations: [
            'Rapid assessment required',
            'Consider early physician evaluation',
            'Continuous monitoring',
            'Expedite diagnostic workup',
          ],
          timestamp: new Date().toISOString(),
        };
      }

      // Step 3: Assess resource needs for Levels 3-5
      const resourceNeeds = this.assessResourceNeeds(patientData);
      
      if (resourceNeeds.count >= 2) {
        // ESI Level 3 - Multiple resources
        return {
          esiLevel: 3,
          category: 'URGENT',
          priority: 'MODERATE',
          maxWaitTime: 60, // minutes
          reasoning: resourceNeeds.reasoning,
          redFlags: [],
          estimatedResources: resourceNeeds.resources,
          recommendations: [
            'Standard triage protocol',
            'Monitor vital signs regularly',
            'Prepare for diagnostic procedures',
          ],
          timestamp: new Date().toISOString(),
        };
      } else if (resourceNeeds.count === 1) {
        // ESI Level 4 - One resource
        return {
          esiLevel: 4,
          category: 'LESS-URGENT',
          priority: 'LOW',
          maxWaitTime: 120, // minutes
          reasoning: resourceNeeds.reasoning,
          redFlags: [],
          estimatedResources: resourceNeeds.resources,
          recommendations: [
            'Standard waiting area',
            'Periodic vital signs check',
            'Patient may wait for available resources',
          ],
          timestamp: new Date().toISOString(),
        };
      } else {
        // ESI Level 5 - No resources
        return {
          esiLevel: 5,
          category: 'NON-URGENT',
          priority: 'MINIMAL',
          maxWaitTime: 240, // minutes
          reasoning: 'Patient stable, no diagnostic resources needed',
          redFlags: [],
          estimatedResources: [],
          recommendations: [
            'Standard waiting area',
            'May be suitable for fast track or urgent care',
            'Reassess if condition changes',
          ],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      throw new MedicalError(
        'ESI calculation failed',
        ErrorCodes.TRIAGE_CALCULATION_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Check for ESI Level 1 criteria
   */
  static checkLevel1(patientData) {
    const redFlags = [];
    const reasoning = [];

    // Check vital signs
    if (patientData.vital_signs) {
      const vs = patientData.vital_signs;
      
      if (vs.heart_rate < LEVEL_1_CRITERIA.vitalSigns.heartRate.min) {
        redFlags.push('Severe bradycardia');
        reasoning.push(`Heart rate critically low: ${vs.heart_rate} bpm`);
      }
      if (vs.heart_rate > LEVEL_1_CRITERIA.vitalSigns.heartRate.max) {
        redFlags.push('Severe tachycardia');
        reasoning.push(`Heart rate critically high: ${vs.heart_rate} bpm`);
      }
      
      if (vs.systolic_bp < LEVEL_1_CRITERIA.vitalSigns.systolicBP.min) {
        redFlags.push('Severe hypotension');
        reasoning.push(`Blood pressure critically low: ${vs.systolic_bp}/${vs.diastolic_bp}`);
      }
      if (vs.systolic_bp > LEVEL_1_CRITERIA.vitalSigns.systolicBP.max) {
        redFlags.push('Severe hypertension');
        reasoning.push(`Blood pressure critically high: ${vs.systolic_bp}/${vs.diastolic_bp}`);
      }
      
      if (vs.respiratory_rate < LEVEL_1_CRITERIA.vitalSigns.respiratoryRate.min) {
        redFlags.push('Severe bradypnea');
        reasoning.push(`Respiratory rate critically low: ${vs.respiratory_rate}/min`);
      }
      if (vs.respiratory_rate > LEVEL_1_CRITERIA.vitalSigns.respiratoryRate.max) {
        redFlags.push('Severe tachypnea');
        reasoning.push(`Respiratory rate critically high: ${vs.respiratory_rate}/min`);
      }
      
      if (vs.oxygen_saturation < LEVEL_1_CRITERIA.vitalSigns.oxygenSaturation.min) {
        redFlags.push('Critical hypoxemia');
        reasoning.push(`Oxygen saturation critically low: ${vs.oxygen_saturation}%`);
      }
      
      if (vs.temperature < LEVEL_1_CRITERIA.vitalSigns.temperature.min ||
          vs.temperature > LEVEL_1_CRITERIA.vitalSigns.temperature.max) {
        redFlags.push('Critical temperature');
        reasoning.push(`Temperature critically abnormal: ${vs.temperature}°C`);
      }
    }

    // Check patient status
    if (LEVEL_1_CRITERIA.conditions.includes(patientData.patient_status)) {
      redFlags.push('Life-threatening condition');
      reasoning.push(`Patient status: ${patientData.patient_status}`);
    }

    // Check incident description for keywords
    const description = patientData.incident_description?.toLowerCase() || '';
    LEVEL_1_CRITERIA.keywords.forEach(keyword => {
      if (description.includes(keyword.toLowerCase())) {
        redFlags.push('Critical keyword detected');
        reasoning.push(`Description indicates: "${keyword}"`);
      }
    });

    return {
      isLevel1: redFlags.length > 0,
      redFlags,
      reasoning: reasoning.join('; '),
    };
  }

  /**
   * Check for ESI Level 2 criteria
   */
  static checkLevel2(patientData) {
    const redFlags = [];
    const reasoning = [];

    // Check vital signs (less critical than Level 1)
    if (patientData.vital_signs) {
      const vs = patientData.vital_signs;
      
      if (vs.heart_rate < LEVEL_2_CRITERIA.vitalSigns.heartRate.min ||
          vs.heart_rate > LEVEL_2_CRITERIA.vitalSigns.heartRate.max) {
        redFlags.push('Abnormal heart rate');
        reasoning.push(`Heart rate concerning: ${vs.heart_rate} bpm`);
      }
      
      if (vs.systolic_bp < LEVEL_2_CRITERIA.vitalSigns.systolicBP.min ||
          vs.systolic_bp > LEVEL_2_CRITERIA.vitalSigns.systolicBP.max) {
        redFlags.push('Abnormal blood pressure');
        reasoning.push(`Blood pressure concerning: ${vs.systolic_bp}/${vs.diastolic_bp}`);
      }
      
      if (vs.respiratory_rate < LEVEL_2_CRITERIA.vitalSigns.respiratoryRate.min ||
          vs.respiratory_rate > LEVEL_2_CRITERIA.vitalSigns.respiratoryRate.max) {
        redFlags.push('Abnormal respiratory rate');
        reasoning.push(`Respiratory rate concerning: ${vs.respiratory_rate}/min`);
      }
      
      if (vs.oxygen_saturation < LEVEL_2_CRITERIA.vitalSigns.oxygenSaturation.min) {
        redFlags.push('Low oxygen saturation');
        reasoning.push(`Oxygen saturation low: ${vs.oxygen_saturation}%`);
      }
    }

    // Check for high-risk situations
    if (LEVEL_2_CRITERIA.highRiskSituations.includes(patientData.incident_type)) {
      redFlags.push('High-risk incident type');
      reasoning.push(`Incident type: ${patientData.incident_type}`);
    }

    // Check for severe pain
    if (patientData.pain_score >= 8) {
      redFlags.push('Severe pain');
      reasoning.push(`Pain score: ${patientData.pain_score}/10`);
    }

    // Check incident description for keywords
    const description = patientData.incident_description?.toLowerCase() || '';
    LEVEL_2_CRITERIA.keywords.forEach(keyword => {
      if (description.includes(keyword.toLowerCase())) {
        redFlags.push('High-risk keyword detected');
        reasoning.push(`Description indicates: "${keyword}"`);
      }
    });

    return {
      isLevel2: redFlags.length > 0,
      redFlags,
      reasoning: reasoning.join('; '),
    };
  }

  /**
   * Assess resource needs for ESI Levels 3-5
   */
  static assessResourceNeeds(patientData) {
    const resources = [];
    let reasoning = [];

    // Predict resources based on incident type
    if (RESOURCE_PREDICTIONS.multipleResources.includes(patientData.incident_type)) {
      resources.push('Lab work', 'Imaging (X-ray/CT)', 'IV fluids', 'Medications');
      reasoning.push(`Incident type "${patientData.incident_type}" typically requires multiple resources`);
    } else if (RESOURCE_PREDICTIONS.singleResource.includes(patientData.incident_type)) {
      resources.push('Basic treatment');
      reasoning.push(`Incident type "${patientData.incident_type}" typically requires one resource`);
    }

    // Additional resource predictions based on patient status
    if (patientData.patient_status === 'bleeding') {
      resources.push('Wound care', 'Suturing supplies');
      reasoning.push('Patient bleeding - requires wound management');
    }

    if (patientData.allergies && patientData.allergies.trim()) {
      resources.push('Allergy assessment');
      reasoning.push('Patient has documented allergies');
    }

    if (patientData.pain_score >= 5) {
      resources.push('Pain management');
      reasoning.push(`Moderate to severe pain (${patientData.pain_score}/10)`);
    }

    // Remove duplicates
    const uniqueResources = [...new Set(resources)];

    return {
      count: uniqueResources.length,
      resources: uniqueResources,
      reasoning: reasoning.join('; ') || 'Standard assessment',
    };
  }

  /**
   * Get ESI level description
   */
  static getESIDescription(level) {
    const descriptions = {
      1: 'Immediate life-saving intervention required',
      2: 'High risk situation, emergent care needed',
      3: 'Urgent, likely to require multiple resources',
      4: 'Less urgent, likely to require one resource',
      5: 'Non-urgent, no resources anticipated',
    };
    return descriptions[level] || 'Unknown';
  }

  /**
   * Validate ESI result and ensure clinical oversight
   */
  static validateESIResult(esiResult, patientData) {
    const warnings = [];

    // Check for ESI-vital sign mismatch
    if (esiResult.esiLevel >= 4 && patientData.vital_signs) {
      const vs = patientData.vital_signs;
      if (vs.oxygen_saturation < 92 || vs.heart_rate > 120 || vs.systolic_bp < 90) {
        warnings.push('WARNING: ESI level may be too low given vital signs. Recommend clinical review.');
      }
    }

    // Check for ESI-pain mismatch
    if (esiResult.esiLevel >= 4 && patientData.pain_score >= 7) {
      warnings.push('WARNING: ESI level may be too low given severe pain. Recommend clinical review.');
    }

    // Check for ESI-age mismatch (pediatric/geriatric)
    if (esiResult.esiLevel >= 4) {
      if (patientData.age_range === '0-18' || patientData.age_range === '71+') {
        warnings.push('NOTICE: Pediatric/geriatric patient. Consider lower ESI threshold.');
      }
    }

    return {
      ...esiResult,
      validationWarnings: warnings,
      requiresClinicalReview: warnings.length > 0,
    };
  }
}

export default ESITriageEngine;
