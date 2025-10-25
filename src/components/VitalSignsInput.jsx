import { useState, useEffect } from 'react';
import './VitalSignsInput.css';

/**
 * Vital Signs Input Component
 * Collects and validates patient vital signs for emergency triage
 */
export const VitalSignsInput = ({ onChange, initialValues = {} }) => {
  const [vitalSigns, setVitalSigns] = useState({
    blood_pressure_systolic: initialValues.blood_pressure_systolic || '',
    blood_pressure_diastolic: initialValues.blood_pressure_diastolic || '',
    heart_rate: initialValues.heart_rate || '',
    respiratory_rate: initialValues.respiratory_rate || '',
    oxygen_saturation: initialValues.oxygen_saturation || '',
    temperature_celsius: initialValues.temperature_celsius || '',
    glasgow_coma_scale: initialValues.glasgow_coma_scale || '',
    pain_level: initialValues.pain_level || '',
    consciousness_level: initialValues.consciousness_level || 'alert',
    has_allergies: initialValues.has_allergies || false,
    allergies_list: initialValues.allergies_list || '',
    current_medications: initialValues.current_medications || '',
    medical_history: initialValues.medical_history || ''
  });

  const [warnings, setWarnings] = useState({});

  useEffect(() => {
    // Validate and set warnings for abnormal vital signs
    const newWarnings = {};

    // Blood Pressure (Normal: 90-140 systolic, 60-90 diastolic)
    if (vitalSigns.blood_pressure_systolic) {
      const sys = parseInt(vitalSigns.blood_pressure_systolic);
      if (sys < 90) newWarnings.bp = 'Hypotension - Critical!';
      else if (sys > 180) newWarnings.bp = 'Hypertensive Crisis!';
      else if (sys > 140) newWarnings.bp = 'Elevated BP';
    }

    // Heart Rate (Normal: 60-100 bpm)
    if (vitalSigns.heart_rate) {
      const hr = parseInt(vitalSigns.heart_rate);
      if (hr < 40) newWarnings.hr = 'Severe Bradycardia!';
      else if (hr < 60) newWarnings.hr = 'Bradycardia';
      else if (hr > 120) newWarnings.hr = 'Tachycardia!';
      else if (hr > 100) newWarnings.hr = 'Elevated HR';
    }

    // Respiratory Rate (Normal: 12-20 breaths/min)
    if (vitalSigns.respiratory_rate) {
      const rr = parseInt(vitalSigns.respiratory_rate);
      if (rr < 8) newWarnings.rr = 'Severe Bradypnea!';
      else if (rr < 12) newWarnings.rr = 'Bradypnea';
      else if (rr > 30) newWarnings.rr = 'Severe Tachypnea!';
      else if (rr > 20) newWarnings.rr = 'Tachypnea';
    }

    // Oxygen Saturation (Normal: >95%)
    if (vitalSigns.oxygen_saturation) {
      const spo2 = parseInt(vitalSigns.oxygen_saturation);
      if (spo2 < 88) newWarnings.spo2 = 'Critical Hypoxemia!';
      else if (spo2 < 92) newWarnings.spo2 = 'Hypoxemia';
      else if (spo2 < 95) newWarnings.spo2 = 'Low O2';
    }

    // Temperature (Normal: 36.1-37.2°C)
    if (vitalSigns.temperature_celsius) {
      const temp = parseFloat(vitalSigns.temperature_celsius);
      if (temp < 35) newWarnings.temp = 'Hypothermia!';
      else if (temp > 40) newWarnings.temp = 'Hyperpyrexia!';
      else if (temp > 38) newWarnings.temp = 'Fever';
      else if (temp < 36) newWarnings.temp = 'Low temp';
    }

    // Glasgow Coma Scale (Normal: 15)
    if (vitalSigns.glasgow_coma_scale) {
      const gcs = parseInt(vitalSigns.glasgow_coma_scale);
      if (gcs <= 8) newWarnings.gcs = 'Severe Brain Injury!';
      else if (gcs <= 12) newWarnings.gcs = 'Moderate Brain Injury';
      else if (gcs < 15) newWarnings.gcs = 'Mild Impairment';
    }

    setWarnings(newWarnings);

    // Calculate if vital signs are abnormal
    const vital_signs_abnormal = Object.keys(newWarnings).length > 0;
    
    // Pass complete data to parent
    onChange?.({
      ...vitalSigns,
      vital_signs_taken_at: new Date().toISOString(),
      vital_signs_abnormal
    });
  }, [vitalSigns, onChange]);

  const handleChange = (field, value) => {
    setVitalSigns(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="vital-signs-container">
      <h3 className="vital-signs-title">
        🩺 Vital Signs Assessment
      </h3>

      <div className="vital-signs-grid">
        {/* Blood Pressure */}
        <div className={`vital-sign-field ${warnings.bp ? 'warning' : ''}`}>
          <label>Blood Pressure (mmHg)</label>
          <div className="bp-inputs">
            <input
              type="number"
              placeholder="Systolic"
              value={vitalSigns.blood_pressure_systolic}
              onChange={(e) => handleChange('blood_pressure_systolic', e.target.value)}
              min="40"
              max="250"
            />
            <span>/</span>
            <input
              type="number"
              placeholder="Diastolic"
              value={vitalSigns.blood_pressure_diastolic}
              onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value)}
              min="30"
              max="150"
            />
          </div>
          {warnings.bp && <span className="warning-text">⚠️ {warnings.bp}</span>}
        </div>

        {/* Heart Rate */}
        <div className={`vital-sign-field ${warnings.hr ? 'warning' : ''}`}>
          <label>Heart Rate (bpm)</label>
          <input
            type="number"
            placeholder="e.g., 72"
            value={vitalSigns.heart_rate}
            onChange={(e) => handleChange('heart_rate', e.target.value)}
            min="20"
            max="250"
          />
          {warnings.hr && <span className="warning-text">⚠️ {warnings.hr}</span>}
          <span className="hint">Normal: 60-100</span>
        </div>

        {/* Respiratory Rate */}
        <div className={`vital-sign-field ${warnings.rr ? 'warning' : ''}`}>
          <label>Respiratory Rate (breaths/min)</label>
          <input
            type="number"
            placeholder="e.g., 16"
            value={vitalSigns.respiratory_rate}
            onChange={(e) => handleChange('respiratory_rate', e.target.value)}
            min="4"
            max="60"
          />
          {warnings.rr && <span className="warning-text">⚠️ {warnings.rr}</span>}
          <span className="hint">Normal: 12-20</span>
        </div>

        {/* Oxygen Saturation */}
        <div className={`vital-sign-field ${warnings.spo2 ? 'warning' : ''}`}>
          <label>Oxygen Saturation (SpO₂%)</label>
          <input
            type="number"
            placeholder="e.g., 98"
            value={vitalSigns.oxygen_saturation}
            onChange={(e) => handleChange('oxygen_saturation', e.target.value)}
            min="50"
            max="100"
          />
          {warnings.spo2 && <span className="warning-text">⚠️ {warnings.spo2}</span>}
          <span className="hint">Normal: &gt;95%</span>
        </div>

        {/* Temperature */}
        <div className={`vital-sign-field ${warnings.temp ? 'warning' : ''}`}>
          <label>Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g., 36.8"
            value={vitalSigns.temperature_celsius}
            onChange={(e) => handleChange('temperature_celsius', e.target.value)}
            min="30"
            max="45"
          />
          {warnings.temp && <span className="warning-text">⚠️ {warnings.temp}</span>}
          <span className="hint">Normal: 36.1-37.2°C</span>
        </div>

        {/* Glasgow Coma Scale */}
        <div className={`vital-sign-field ${warnings.gcs ? 'warning' : ''}`}>
          <label>Glasgow Coma Scale (GCS)</label>
          <input
            type="number"
            placeholder="3-15"
            value={vitalSigns.glasgow_coma_scale}
            onChange={(e) => handleChange('glasgow_coma_scale', e.target.value)}
            min="3"
            max="15"
          />
          {warnings.gcs && <span className="warning-text">⚠️ {warnings.gcs}</span>}
          <span className="hint">Normal: 15 (best)</span>
        </div>

        {/* Pain Level */}
        <div className="vital-sign-field">
          <label>Pain Level (0-10)</label>
          <div className="pain-scale">
            <input
              type="range"
              min="0"
              max="10"
              value={vitalSigns.pain_level}
              onChange={(e) => handleChange('pain_level', e.target.value)}
            />
            <span className="pain-value">{vitalSigns.pain_level || 0}/10</span>
          </div>
          <div className="pain-labels">
            <span>No Pain</span>
            <span>Worst Pain</span>
          </div>
        </div>

        {/* Consciousness Level */}
        <div className="vital-sign-field">
          <label>Consciousness Level</label>
          <select
            value={vitalSigns.consciousness_level}
            onChange={(e) => handleChange('consciousness_level', e.target.value)}
          >
            <option value="alert">Alert & Oriented</option>
            <option value="drowsy">Drowsy</option>
            <option value="confused">Confused</option>
            <option value="unresponsive">Unresponsive</option>
            <option value="responds_to_pain">Responds to Pain Only</option>
          </select>
        </div>
      </div>

      {/* Medical History Section */}
      <div className="medical-history-section">
        <h4>Medical History</h4>

        <div className="checkbox-field">
          <input
            type="checkbox"
            id="has_allergies"
            checked={vitalSigns.has_allergies}
            onChange={(e) => handleChange('has_allergies', e.target.checked)}
          />
          <label htmlFor="has_allergies">Patient has allergies</label>
        </div>

        {vitalSigns.has_allergies && (
          <div className="vital-sign-field">
            <label>Allergies (medications, foods, etc.)</label>
            <textarea
              placeholder="e.g., Penicillin, Peanuts, Latex"
              value={vitalSigns.allergies_list}
              onChange={(e) => handleChange('allergies_list', e.target.value)}
              rows="2"
            />
          </div>
        )}

        <div className="vital-sign-field">
          <label>Current Medications</label>
          <textarea
            placeholder="List any medications the patient is currently taking"
            value={vitalSigns.current_medications}
            onChange={(e) => handleChange('current_medications', e.target.value)}
            rows="2"
          />
        </div>

        <div className="vital-sign-field">
          <label>Relevant Medical History</label>
          <textarea
            placeholder="Chronic conditions, previous surgeries, etc."
            value={vitalSigns.medical_history}
            onChange={(e) => handleChange('medical_history', e.target.value)}
            rows="3"
          />
        </div>
      </div>

      {/* Abnormal Vitals Alert */}
      {Object.keys(warnings).length > 0 && (
        <div className="abnormal-vitals-alert">
          <strong>⚠️ Abnormal Vital Signs Detected</strong>
          <p>This patient requires immediate medical attention. Priority triage recommended.</p>
        </div>
      )}
    </div>
  );
};
