import Joi from 'joi';
import { handleJoiError } from '../services/errorHandlerService.js';

/**
 * Validation Middleware - Comprehensive Input Validation
 * Uses Joi for schema-based validation
 */

// ==========================================
// REGEX PATTERNS
// ==========================================

// Jamaica TRN: 9 digits
const TRN_PATTERN = /^\d{9}$/;

// Jamaica Phone: +1-876-XXX-XXXX or variations
const JAMAICA_PHONE_PATTERN = /^(\+?1)?[-.\s]?(\()?876(\))?[-.\s]?\d{3}[-.\s]?\d{4}$/;

// Name pattern: letters, spaces, hyphens, apostrophes only
const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;

// ==========================================
// PATIENT REPORT VALIDATION SCHEMA
// ==========================================

export const patientReportSchema = Joi.object({
  // Basic Information
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .required()
    .messages({
      'any.only': 'Gender must be male, female, or other',
      'any.required': 'Gender is required'
    }),
  
  age_range: Joi.string()
    .valid('0-10', '11-30', '31-50', '51+')
    .required()
    .messages({
      'any.only': 'Age range must be one of: 0-10, 11-30, 31-50, 51+',
      'any.required': 'Age range is required'
    }),
  
  trn: Joi.string()
    .pattern(TRN_PATTERN)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'TRN must be exactly 9 digits'
    }),
  
  // Incident Information
  incident_type: Joi.string()
    .valid('shooting', 'stabbing', 'motor-vehicle-accident', 'fall', 'burn', 'other')
    .required()
    .messages({
      'any.only': 'Invalid incident type',
      'any.required': 'Incident type is required'
    }),
  
  incident_description: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Please provide at least 10 characters describing the incident',
      'string.max': 'Incident description is too long (max 2000 characters)',
      'any.required': 'Incident description is required for AI triage'
    }),
  
  // Patient Status
  patient_status: Joi.string()
    .valid('unconscious', 'conscious', 'bleeding', 'difficulty_breathing', 'chest_pain', 'fracture')
    .required()
    .messages({
      'any.only': 'Invalid patient status',
      'any.required': 'Patient status is required'
    }),
  
  transportation_mode: Joi.string()
    .valid('ambulance', 'private-vehicle', 'taxi', 'police-vehicle', 'self-walk')
    .required()
    .messages({
      'any.only': 'Invalid transportation mode',
      'any.required': 'Transportation mode is required'
    }),
  
  // Contact Information (at least one required)
  contact_email: Joi.string()
    .email()
    .optional()
    .allow(null, '')
    .messages({
      'string.email': 'Please enter a valid email address'
    }),
  
  contact_phone: Joi.string()
    .pattern(JAMAICA_PHONE_PATTERN)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please enter a valid Jamaican phone number (format: +1-876-XXX-XXXX)'
    }),
  
  // Emergency Contact
  emergency_contact_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(NAME_PATTERN)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Emergency contact name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  emergency_contact_phone: Joi.string()
    .pattern(JAMAICA_PHONE_PATTERN)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please enter a valid Jamaican phone number for emergency contact'
    }),
  
  // Location
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .allow(null),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .allow(null),
  
  location_address: Joi.string()
    .max(500)
    .optional()
    .allow(null, ''),
  
  // Vital Signs (optional but validated if provided)
  vital_signs: Joi.object({
    systolic_bp: Joi.number()
      .min(60)
      .max(250)
      .optional()
      .messages({
        'number.min': 'Systolic BP must be at least 60 mmHg',
        'number.max': 'Systolic BP cannot exceed 250 mmHg'
      }),
    
    diastolic_bp: Joi.number()
      .min(40)
      .max(150)
      .optional()
      .messages({
        'number.min': 'Diastolic BP must be at least 40 mmHg',
        'number.max': 'Diastolic BP cannot exceed 150 mmHg'
      }),
    
    heart_rate: Joi.number()
      .min(40)
      .max(200)
      .optional()
      .messages({
        'number.min': 'Heart rate must be at least 40 bpm',
        'number.max': 'Heart rate cannot exceed 200 bpm'
      }),
    
    respiratory_rate: Joi.number()
      .min(8)
      .max(40)
      .optional()
      .messages({
        'number.min': 'Respiratory rate must be at least 8 breaths/min',
        'number.max': 'Respiratory rate cannot exceed 40 breaths/min'
      }),
    
    oxygen_saturation: Joi.number()
      .min(70)
      .max(100)
      .optional()
      .messages({
        'number.min': 'Oxygen saturation must be at least 70%',
        'number.max': 'Oxygen saturation cannot exceed 100%'
      }),
    
    temperature: Joi.number()
      .min(35)
      .max(42)
      .optional()
      .messages({
        'number.min': 'Temperature must be at least 35°C',
        'number.max': 'Temperature cannot exceed 42°C'
      })
  }).optional(),
  
  pain_score: Joi.number()
    .integer()
    .min(0)
    .max(10)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Pain score must be between 0 and 10',
      'number.max': 'Pain score must be between 0 and 10',
      'number.integer': 'Pain score must be a whole number'
    }),
  
  allergies: Joi.string()
    .max(500)
    .optional()
    .allow(null, ''),
  
  current_medications: Joi.string()
    .max(1000)
    .optional()
    .allow(null, ''),
  
  chronic_conditions: Joi.string()
    .max(500)
    .optional()
    .allow(null, ''),
  
  // Consent (required for HIPAA compliance)
  consent_data_storage: Joi.boolean()
    .optional()
    .default(false),
  
  consent_location_tracking: Joi.boolean()
    .optional()
    .default(false),
  
  consent_communication: Joi.boolean()
    .optional()
    .default(false)
})
.custom((value, helpers) => {
  // Custom validation: At least one contact method required
  if (!value.contact_email && !value.contact_phone) {
    return helpers.error('contact.required');
  }
  
  // Custom validation: If vital signs BP provided, both systolic and diastolic required
  if (value.vital_signs) {
    const hasSystolic = value.vital_signs.systolic_bp !== undefined;
    const hasDiastolic = value.vital_signs.diastolic_bp !== undefined;
    
    if (hasSystolic !== hasDiastolic) {
      return helpers.error('vitals.bp.both_required');
    }
    
    // Validate BP relationship (systolic > diastolic)
    if (hasSystolic && hasDiastolic) {
      if (value.vital_signs.systolic_bp <= value.vital_signs.diastolic_bp) {
        return helpers.error('vitals.bp.systolic_greater');
      }
    }
  }
  
  return value;
})
.messages({
  'contact.required': 'Either email or phone number is required for notifications',
  'vitals.bp.both_required': 'Both systolic and diastolic blood pressure must be provided together',
  'vitals.bp.systolic_greater': 'Systolic blood pressure must be greater than diastolic'
});

// ==========================================
// MEDICAL STAFF VALIDATION SCHEMA
// ==========================================

export const medicalStaffRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Last name is required'
    }),
  
  role: Joi.string()
    .valid('doctor', 'nurse')
    .required()
    .messages({
      'any.only': 'Role must be either doctor or nurse',
      'any.required': 'Role is required'
    }),
  
  hospitalAffiliation: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'Hospital affiliation is required'
    }),
  
  medicalLicense: Joi.string()
    .min(5)
    .max(50)
    .required()
    .messages({
      'any.required': 'Medical license number is required'
    })
});

// ==========================================
// LOGIN VALIDATION SCHEMA
// ==========================================

export const loginSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'any.required': 'Username is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid('doctor', 'nurse', 'admin')
    .required()
    .messages({
      'any.only': 'Role must be doctor, nurse, or admin',
      'any.required': 'Role is required'
    })
});

// ==========================================
// VALIDATION MIDDLEWARE FUNCTIONS
// ==========================================

/**
 * Generic validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Collect all errors
      stripUnknown: true // Remove unknown fields
    });
    
    if (error) {
      const validationError = handleJoiError(error);
      return next(validationError);
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validate patient report
 */
export const validatePatientReport = validate(patientReportSchema);

/**
 * Validate medical staff request
 */
export const validateMedicalStaffRequest = validate(medicalStaffRequestSchema);

/**
 * Validate login
 */
export const validateLogin = validate(loginSchema);

/**
 * Validate query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = handleJoiError(error);
      return next(validationError);
    }
    
    req.query = value;
    next();
  };
};

/**
 * Validate route parameters
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });
    
    if (error) {
      const validationError = handleJoiError(error);
      return next(validationError);
    }
    
    req.params = value;
    next();
  };
};

// ==========================================
// COMMON PARAMETER SCHEMAS
// ==========================================

export const reportIdSchema = Joi.object({
  reportId: Joi.string()
    .pattern(/^RPT_\d+_[A-Z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid report ID format'
    })
});

export const hospitalIdSchema = Joi.object({
  hospitalId: Joi.string()
    .pattern(/^HOSP_\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid hospital ID format'
    })
});

export default {
  patientReportSchema,
  medicalStaffRequestSchema,
  loginSchema,
  validate,
  validatePatientReport,
  validateMedicalStaffRequest,
  validateLogin,
  validateQuery,
  validateParams,
  reportIdSchema,
  hospitalIdSchema
};
