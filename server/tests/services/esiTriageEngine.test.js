import { describe, it, expect } from 'vitest';
import ESITriageEngine from '../../services/esiTriageEngine.js';

describe('ESI Triage Engine', () => {
  describe('ESI Level 1 - Critical', () => {
    it('should classify severe bradycardia as ESI 1', () => {
      const patientData = {
        vital_signs: {
          heart_rate: 35,
          systolic_bp: 120,
          diastolic_bp: 80,
          respiratory_rate: 16,
          oxygen_saturation: 98,
          temperature: 37.0,
        },
        incident_type: 'chest-pain',
        patient_status: 'conscious',
        age_range: '51-70',
        gender: 'male',
      };

      const result = ESITriageEngine.calculateESI(patientData);
      
      expect(result.esiLevel).toBe(1);
      expect(result.category).toBe('RESUSCITATION');
      expect(result.priority).toBe('IMMEDIATE');
      expect(result.redFlags).toContain('Severe bradycardia');
    });

    it('should classify critical hypoxemia as ESI 1', () => {
      const patientData = {
        vital_signs: {
          heart_rate: 110,
          systolic_bp: 120,
          diastolic_bp: 80,
          respiratory_rate: 28,
          oxygen_saturation: 82,
          temperature: 37.0,
        },
        incident_type: 'difficulty-breathing',
        patient_status: 'conscious',
        age_range: '51-70',
        gender: 'female',
      };

      const result = ESITriageEngine.calculateESI(patientData);
      
      expect(result.esiLevel).toBe(1);
      expect(result.redFlags).toContain('Critical hypoxemia');
    });
  });

  describe('ESI Level 2 - Emergent', () => {
    it('should classify moderate tachycardia with severe pain as ESI 2', () => {
      const patientData = {
        vital_signs: {
          heart_rate: 135,
          systolic_bp: 150,
          diastolic_bp: 95,
          respiratory_rate: 22,
          oxygen_saturation: 95,
          temperature: 37.2,
        },
        incident_type: 'chest-pain',
        patient_status: 'conscious',
        pain_score: 9,
        age_range: '51-70',
        gender: 'male',
      };

      const result = ESITriageEngine.calculateESI(patientData);
      
      expect(result.esiLevel).toBe(2);
      expect(result.category).toBe('EMERGENT');
      expect(result.priority).toBe('HIGH');
    });
  });

  describe('ESI Level 3 - Urgent', () => {
    it('should classify motor vehicle accident as ESI 3', () => {
      const patientData = {
        vital_signs: {
          heart_rate: 90,
          systolic_bp: 130,
          diastolic_bp: 85,
          respiratory_rate: 18,
          oxygen_saturation: 97,
          temperature: 37.0,
        },
        incident_type: 'motor-vehicle-accident',
        patient_status: 'conscious',
        pain_score: 5,
        age_range: '31-50',
        gender: 'male',
      };

      const result = ESITriageEngine.calculateESI(patientData);
      
      expect(result.esiLevel).toBe(3);
      expect(result.category).toBe('URGENT');
      expect(result.estimatedResources.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ESI Level 4-5 - Less Urgent/Non-Urgent', () => {
    it('should classify minor injury as ESI 4', () => {
      const patientData = {
        vital_signs: {
          heart_rate: 75,
          systolic_bp: 120,
          diastolic_bp: 80,
          respiratory_rate: 16,
          oxygen_saturation: 99,
          temperature: 37.0,
        },
        incident_type: 'minor-injury',
        patient_status: 'conscious',
        pain_score: 3,
        age_range: '19-30',
        gender: 'female',
      };

      const result = ESITriageEngine.calculateESI(patientData);
      
      expect(result.esiLevel).toBe(4);
      expect(result.category).toBe('LESS-URGENT');
    });
  });

  describe('Validation', () => {
    it('should warn about low ESI with abnormal vitals', () => {
      const patientData = {
        vital_signs: {
          heart_rate: 125,
          systolic_bp: 85,
          diastolic_bp: 55,
          respiratory_rate: 16,
          oxygen_saturation: 91,
          temperature: 37.0,
        },
        incident_type: 'minor-injury',
        patient_status: 'conscious',
        pain_score: 2,
        age_range: '19-30',
        gender: 'female',
      };

      const esiResult = ESITriageEngine.calculateESI(patientData);
      const validated = ESITriageEngine.validateESIResult(esiResult, patientData);
      
      expect(validated.requiresClinicalReview).toBe(true);
      expect(validated.validationWarnings.length).toBeGreaterThan(0);
    });
  });
});
