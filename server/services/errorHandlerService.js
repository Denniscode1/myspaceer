/**
 * Error Handler Service - Centralized Error Management
 * Provides consistent error handling across the medical system
 */

/**
 * Custom Application Error
 * Base class for all application errors
 */
export class AppError extends Error {
  constructor(message, statusCode, errorCode, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Error Codes - Standardized error codes for the system
 */
export const ErrorCodes = {
  // Validation Errors (001-099)
  INVALID_INPUT: 'ERR_001',
  MISSING_REQUIRED_FIELD: 'ERR_002',
  INVALID_FORMAT: 'ERR_003',
  INVALID_TRN: 'ERR_004',
  INVALID_PHONE: 'ERR_005',
  INVALID_EMAIL: 'ERR_006',
  INVALID_AGE_RANGE: 'ERR_007',
  INVALID_VITAL_SIGNS: 'ERR_008',
  INVALID_PAIN_SCORE: 'ERR_009',
  
  // Authentication Errors (100-199)
  UNAUTHORIZED: 'ERR_101',
  INVALID_CREDENTIALS: 'ERR_102',
  SESSION_EXPIRED: 'ERR_103',
  INVALID_TOKEN: 'ERR_104',
  MFA_REQUIRED: 'ERR_105',
  MFA_FAILED: 'ERR_106',
  ACCOUNT_LOCKED: 'ERR_107',
  
  // Authorization Errors (200-299)
  FORBIDDEN: 'ERR_201',
  INSUFFICIENT_PERMISSIONS: 'ERR_202',
  ACCESS_DENIED: 'ERR_203',
  MEDICAL_STAFF_ONLY: 'ERR_204',
  DOCTOR_ONLY: 'ERR_205',
  
  // Medical/Clinical Errors (300-399)
  TRIAGE_FAILED: 'ERR_301',
  INVALID_VITAL_SIGNS_RANGE: 'ERR_302',
  DUPLICATE_PATIENT: 'ERR_303',
  PATIENT_NOT_FOUND: 'ERR_304',
  CRITICAL_CONDITION_ALERT: 'ERR_305',
  RED_FLAG_DETECTED: 'ERR_306',
  HOSPITAL_NOT_AVAILABLE: 'ERR_307',
  HOSPITAL_AT_CAPACITY: 'ERR_308',
  
  // System Errors (400-499)
  DATABASE_ERROR: 'ERR_401',
  EXTERNAL_SERVICE_ERROR: 'ERR_402',
  RATE_LIMIT_EXCEEDED: 'ERR_403',
  SERVICE_UNAVAILABLE: 'ERR_404',
  CONFIGURATION_ERROR: 'ERR_405',
  ENCRYPTION_ERROR: 'ERR_406',
  AUDIT_LOG_ERROR: 'ERR_407',
  
  // Notification Errors (500-599)
  NOTIFICATION_FAILED: 'ERR_501',
  SMS_FAILED: 'ERR_502',
  EMAIL_FAILED: 'ERR_503',
  PUSH_NOTIFICATION_FAILED: 'ERR_504',
  RECIPIENT_NOT_FOUND: 'ERR_505',
  
  // Internal Errors (900-999)
  INTERNAL_ERROR: 'ERR_900',
  UNKNOWN_ERROR: 'ERR_999'
};

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ErrorCodes.INVALID_INPUT, true, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message, errorCode = ErrorCodes.UNAUTHORIZED) {
    super(message, 401, errorCode, true);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message, errorCode = ErrorCodes.FORBIDDEN) {
    super(message, 403, errorCode, true);
    this.name = 'AuthorizationError';
  }
}

/**
 * Medical Error - For clinical/medical system errors
 */
export class MedicalError extends AppError {
  constructor(message, errorCode, details = null) {
    super(message, 422, errorCode, true, details);
    this.name = 'MedicalError';
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, false, originalError?.message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName, message, originalError = null) {
    super(
      `External service '${serviceName}' failed: ${message}`,
      503,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      true,
      originalError?.message
    );
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super(
      'Too many requests. Please try again later.',
      429,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      true,
      { retryAfter }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Convert non-operational errors to AppError
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const errorCode = error.code || ErrorCodes.INTERNAL_ERROR;
    
    error = new AppError(message, statusCode, errorCode, false);
  }
  
  // Log error (in production, use proper logging service)
  console.error('Error occurred:', {
    code: error.errorCode,
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    timestamp: error.timestamp,
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    }
  });
  
  // Log to audit trail for security-sensitive errors
  if (isSecuritySensitiveError(error)) {
    // Import audit service dynamically to avoid circular dependency
    import('./auditService.js').then(({ logAuditAction }) => {
      logAuditAction({
        eventType: 'security_error',
        entityType: 'system',
        entityId: 'error',
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'anonymous',
        ipAddress: req.ip,
        actionDescription: `Security error: ${error.errorCode} - ${error.message}`
      }).catch(auditErr => {
        console.error('Failed to log security error to audit:', auditErr);
      });
    });
  }
  
  // Prepare response
  const response = {
    success: false,
    error: {
      code: error.errorCode,
      message: error.message,
      timestamp: error.timestamp
    }
  };
  
  // Include details in development mode or for operational errors
  if (process.env.NODE_ENV !== 'production' || error.isOperational) {
    if (error.details) {
      response.error.details = error.details;
    }
    
    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
      response.error.stack = error.stack;
    }
  }
  
  // Special handling for rate limit errors
  if (error instanceof RateLimitError) {
    res.setHeader('Retry-After', error.retryAfter);
  }
  
  // Send response
  res.status(error.statusCode).json(response);
};

/**
 * Check if error is security-sensitive
 */
function isSecuritySensitiveError(error) {
  const securityCodes = [
    ErrorCodes.UNAUTHORIZED,
    ErrorCodes.INVALID_CREDENTIALS,
    ErrorCodes.MFA_FAILED,
    ErrorCodes.ACCOUNT_LOCKED,
    ErrorCodes.ACCESS_DENIED,
    ErrorCodes.FORBIDDEN
  ];
  
  return securityCodes.includes(error.errorCode);
}

/**
 * Async Error Wrapper - Catches async errors in route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'ERR_404',
    true
  );
  next(error);
};

/**
 * Convert Joi validation errors to AppError
 */
export const handleJoiError = (joiError) => {
  const details = joiError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type
  }));
  
  return new ValidationError('Validation failed', details);
};

/**
 * User-friendly error messages for common errors
 */
export const ErrorMessages = {
  // Validation
  REQUIRED_FIELD: (field) => `${field} is required`,
  INVALID_FORMAT: (field) => `${field} has an invalid format`,
  INVALID_RANGE: (field, min, max) => `${field} must be between ${min} and ${max}`,
  
  // Authentication
  INVALID_LOGIN: 'Invalid email or password',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  MFA_REQUIRED: 'Two-factor authentication is required',
  
  // Medical
  TRIAGE_FAILED: 'Unable to complete triage assessment. Please try again.',
  HOSPITAL_UNAVAILABLE: 'No hospitals available at this time. Please call emergency services.',
  CRITICAL_CONDITION: 'Critical condition detected. Immediate medical attention required.',
  
  // System
  DATABASE_ERROR: 'A system error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please wait before trying again.'
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  MedicalError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  ErrorCodes,
  ErrorMessages,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleJoiError
};
