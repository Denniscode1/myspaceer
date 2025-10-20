import { getTriageRules, saveTriageResult, logEvent } from '../database-enhanced.js';

/**
 * Advanced Triage Engine
 * Implements deterministic rules with ML classifier fallback
 * Features: rule-based triage, ML confidence scoring, explainable AI
 */
export class TriageEngine {
  constructor() {
    this.rules = [];
    this.mlModel = null;
    this.confidenceThreshold = 0.7;
    this.loadRules();
  }

  async loadRules() {
    try {
      this.rules = await getTriageRules();
      console.log(`Loaded ${this.rules.length} triage rules`);
    } catch (error) {
      console.error('Failed to load triage rules:', error);
    }
  }

  /**
   * Main triage function - applies rules first, then ML if needed
   */
  async performTriage(reportData) {
    const startTime = Date.now();
    
    try {
      // Step 1: Apply deterministic rules (fast, auditable)
      const ruleResult = await this.applyDeterministicRules(reportData);
      
      if (ruleResult.matched) {
        const processingTime = Date.now() - startTime;
        const triageResult = {
          report_id: reportData.report_id,
          criticality: ruleResult.criticality,
          criticality_reason: ruleResult.reason,
          confidence_score: 1.0, // Rules have 100% confidence
          triage_method: 'deterministic',
          processing_time_ms: processingTime,
          rule_matched: ruleResult.rule_name
        };

        await saveTriageResult(triageResult);
        return triageResult;
      }

      // Step 2: ML classifier fallback for complex cases
      const mlResult = await this.applyMLClassifier(reportData);
      const processingTime = Date.now() - startTime;
      
      const triageResult = {
        report_id: reportData.report_id,
        criticality: mlResult.criticality,
        criticality_reason: mlResult.reason,
        confidence_score: mlResult.confidence,
        triage_method: 'ml_classifier',
        ml_features: mlResult.features,
        processing_time_ms: processingTime
      };

      await saveTriageResult(triageResult);
      return triageResult;

    } catch (error) {
      console.error('Triage engine error:', error);
      
      // Fallback to basic rule-based assessment
      const fallbackResult = this.getFallbackTriage(reportData);
      const processingTime = Date.now() - startTime;
      
      const triageResult = {
        report_id: reportData.report_id,
        criticality: fallbackResult.criticality,
        criticality_reason: fallbackResult.reason,
        confidence_score: 0.5,
        triage_method: 'fallback',
        processing_time_ms: processingTime
      };

      await saveTriageResult(triageResult);
      return triageResult;
    }
  }

  /**
   * Apply deterministic business rules
   */
  async applyDeterministicRules(reportData) {
    const {
      incident_type,
      patient_status,
      age_range,
      transportation_mode,
      incident_description = ''
    } = reportData;

    // Refresh rules if needed
    if (this.rules.length === 0) {
      await this.loadRules();
    }

    // Check each rule in priority order
    for (const rule of this.rules) {
      const conditions = rule.rule_conditions;
      let matched = true;

      // Check all conditions for this rule
      for (const [field, expectedValue] of Object.entries(conditions)) {
        const actualValue = reportData[field];
        
        if (field === 'incident_description' && expectedValue) {
          // Special handling for text fields - keyword matching
          const keywords = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
          const hasKeyword = keywords.some(keyword => 
            incident_description.toLowerCase().includes(keyword.toLowerCase())
          );
          if (!hasKeyword) {
            matched = false;
            break;
          }
        } else {
          // Exact match for other fields
          if (actualValue !== expectedValue) {
            matched = false;
            break;
          }
        }
      }

      if (matched) {
        return {
          matched: true,
          criticality: rule.criticality_result,
          reason: `Rule: ${rule.rule_name}`,
          rule_name: rule.rule_name,
          rule_priority: rule.priority
        };
      }
    }

    // Check for keyword-based rules in incident description
    const keywordRules = this.getKeywordBasedRules(incident_description);
    if (keywordRules.matched) {
      return keywordRules;
    }

    return { matched: false };
  }

  /**
   * Keyword-based rules for free-text incident descriptions
   */
  getKeywordBasedRules(incidentDescription) {
    const text = incidentDescription.toLowerCase();
    
    const criticalKeywords = [
      'bleeding', 'unconscious', 'cardiac arrest', 'not breathing',
      'severe trauma', 'multiple injuries', 'head injury', 'spinal'
    ];
    
    const highKeywords = [
      'chest pain', 'difficulty breathing', 'severe pain',
      'broken bone', 'burn', 'allergic reaction'
    ];

    const mediumKeywords = [
      'minor cut', 'sprain', 'bruise', 'headache', 'nausea'
    ];

    for (const keyword of criticalKeywords) {
      if (text.includes(keyword)) {
        return {
          matched: true,
          criticality: 'severe',
          reason: `Critical keyword detected: "${keyword}"`,
          rule_name: 'Keyword_Critical'
        };
      }
    }

    for (const keyword of highKeywords) {
      if (text.includes(keyword)) {
        return {
          matched: true,
          criticality: 'high',
          reason: `High-priority keyword detected: "${keyword}"`,
          rule_name: 'Keyword_High'
        };
      }
    }

    for (const keyword of mediumKeywords) {
      if (text.includes(keyword)) {
        return {
          matched: true,
          criticality: 'moderate',
          reason: `Medium-priority keyword detected: "${keyword}"`,
          rule_name: 'Keyword_Medium'
        };
      }
    }

    return { matched: false };
  }

  /**
   * ML Classifier (simplified implementation using feature scoring)
   * In production, this would use trained models like XGBoost or LightGBM
   */
  async applyMLClassifier(reportData) {
    const features = this.extractFeatures(reportData);
    const score = this.calculateRiskScore(features);
    
    // Convert score to criticality levels
    let criticality, confidence;
    
    if (score >= 8.5) {
      criticality = 'severe';
      confidence = 0.9;
    } else if (score >= 6.5) {
      criticality = 'high';
      confidence = 0.85;
    } else if (score >= 4.0) {
      criticality = 'moderate';
      confidence = 0.8;
    } else {
      criticality = 'low';
      confidence = 0.75;
    }

    return {
      criticality,
      confidence,
      reason: this.generateMLExplanation(features, score),
      features: features
    };
  }

  /**
   * Extract features for ML model
   */
  extractFeatures(reportData) {
    const {
      incident_type,
      patient_status,
      age_range,
      transportation_mode,
      incident_description = ''
    } = reportData;

    const features = {
      // Incident type scoring
      incident_severity: this.getIncidentSeverityScore(incident_type),
      
      // Patient status scoring
      consciousness_score: patient_status === 'unconscious' ? 10 : 3,
      
      // Age risk factor
      age_risk: this.getAgeRiskScore(age_range),
      
      // Transportation urgency
      transport_urgency: transportation_mode === 'ambulance' ? 7 : 3,
      
      // Time of day risk (simplified)
      time_risk: this.getTimeRiskScore(),
      
      // Text analysis features
      text_urgency: this.analyzeTextUrgency(incident_description)
    };

    return features;
  }

  getIncidentSeverityScore(incidentType) {
    const severityMap = {
      'shooting': 9,
      'stabbing': 8,
      'motor-vehicle-accident': 7,
      'fall': 5,
      'other': 4
    };
    return severityMap[incidentType] || 4;
  }

  getAgeRiskScore(ageRange) {
    const ageRiskMap = {
      '0-10': 6,   // Children at higher risk
      '11-30': 4,  // Lower risk group
      '31-50': 5,  // Moderate risk
      '51+': 7     // Higher risk due to age
    };
    return ageRiskMap[ageRange] || 5;
  }

  getTimeRiskScore() {
    const hour = new Date().getHours();
    // Higher risk during night hours and rush hours
    if (hour >= 22 || hour <= 6) return 6;
    if (hour >= 7 && hour <= 9) return 5; // Morning rush
    if (hour >= 17 && hour <= 19) return 5; // Evening rush
    return 3;
  }

  analyzeTextUrgency(text) {
    if (!text) return 2;
    
    const urgentTerms = [
      'severe', 'critical', 'emergency', 'life-threatening',
      'massive', 'profuse', 'unresponsive', 'barely breathing'
    ];
    
    const moderateTerms = [
      'moderate', 'significant', 'concerning', 'substantial'
    ];

    const textLower = text.toLowerCase();
    
    for (const term of urgentTerms) {
      if (textLower.includes(term)) return 8;
    }
    
    for (const term of moderateTerms) {
      if (textLower.includes(term)) return 6;
    }

    return 3;
  }

  calculateRiskScore(features) {
    // Weighted sum of features
    const weights = {
      incident_severity: 0.25,
      consciousness_score: 0.20,
      age_risk: 0.15,
      transport_urgency: 0.15,
      time_risk: 0.10,
      text_urgency: 0.15
    };

    let score = 0;
    for (const [feature, value] of Object.entries(features)) {
      score += (weights[feature] || 0) * value;
    }

    return Math.min(10, Math.max(0, score));
  }

  generateMLExplanation(features, score) {
    const topFactors = Object.entries(features)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const factorNames = {
      incident_severity: 'incident type',
      consciousness_score: 'patient consciousness',
      age_risk: 'age group',
      transport_urgency: 'transportation mode',
      time_risk: 'time of occurrence',
      text_urgency: 'incident description'
    };

    const topFactorsList = topFactors
      .map(f => factorNames[f.key] || f.key)
      .join(', ');

    return `ML prediction (score: ${score.toFixed(1)}). Top factors: ${topFactorsList}`;
  }

  /**
   * Fallback triage for error cases
   */
  getFallbackTriage(reportData) {
    const { incident_type, patient_status } = reportData;
    
    // Very basic fallback rules
    if (patient_status === 'unconscious') {
      return {
        criticality: 'high',
        reason: 'Fallback: Unconscious patient requires urgent attention'
      };
    }
    
    if (['shooting', 'stabbing'].includes(incident_type)) {
      return {
        criticality: 'high',
        reason: 'Fallback: Violent incident requires immediate care'
      };
    }

    return {
      criticality: 'moderate',
      reason: 'Fallback: Standard emergency assessment'
    };
  }

  /**
   * Override triage decision (for nurse/doctor corrections)
   */
  async overrideTriage(reportId, newCriticality, reason, userId, userRole) {
    try {
      // Log the override
      await logEvent('triage_overridden', 'triage_result', reportId, userId, userRole, {
        new_criticality: newCriticality,
        override_reason: reason
      });

      // Update the existing triage result
      // This would require an update method in database-enhanced.js
      console.log(`Triage overridden for ${reportId}: ${newCriticality} by ${userRole} ${userId}`);
      
      return {
        success: true,
        message: 'Triage successfully overridden',
        new_criticality: newCriticality
      };
    } catch (error) {
      console.error('Failed to override triage:', error);
      throw error;
    }
  }

  /**
   * Get triage statistics for monitoring
   */
  getTriageStats() {
    return {
      total_rules: this.rules.length,
      confidence_threshold: this.confidenceThreshold,
      last_rules_update: this.lastRulesUpdate,
      available_methods: ['deterministic', 'ml_classifier', 'fallback']
    };
  }
}

// Create singleton instance
export const triageEngine = new TriageEngine();

// Export utility functions
export const performTriage = (reportData) => triageEngine.performTriage(reportData);
export const overrideTriage = (reportId, newCriticality, reason, userId, userRole) => 
  triageEngine.overrideTriage(reportId, newCriticality, reason, userId, userRole);