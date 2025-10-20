import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult, param, query } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss';

/**
 * MySpaceER Security Middleware
 * Comprehensive security layer for the emergency response system
 */

// Security configuration
const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-jwt-secret-key',
  JWT_EXPIRES_IN: '24h',
  BCRYPT_ROUNDS: 12,
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-session-secret',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
};

/**
 * Basic Security Headers and Protection
 */
export const basicSecurity = [
  // Helmet for various security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.mapbox.com", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // CORS configuration
  cors({
    origin: function (origin, callback) {
      // Allow requests from same origin and localhost during development
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://localhost:3000',
        'https://localhost:5173',
        process.env.FRONTEND_URL,
        // Add your Netlify domain here when deploying
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),

  // Cookie parser
  cookieParser(),

  // MongoDB/NoSQL injection prevention (works for any DB)
  mongoSanitize(),

  // HTTP Parameter Pollution prevention
  hpp(),

  // Session configuration
  session({
    secret: SECURITY_CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }),
];

/**
 * Rate Limiting
 */
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for localhost in development
      return process.env.NODE_ENV !== 'production' && 
             (req.ip === '127.0.0.1' || req.ip === '::1');
    }
  });
};

// Specific rate limits
export const generalRateLimit = createRateLimit(15 * 60 * 1000, 1000, 'Too many requests, please try again later.');
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later.');
export const apiRateLimit = createRateLimit(1 * 60 * 1000, 100, 'API rate limit exceeded.');

/**
 * Input Validation and Sanitization
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return xss(str.trim());
  };

  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

/**
 * Authentication Middleware
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, {
    expiresIn: SECURITY_CONFIG.JWT_EXPIRES_IN
  });
};

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.session.token ||
                req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, SECURITY_CONFIG.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Validation Rules
 */
export const validatePatientData = [
  body('firstName').notEmpty().trim().isLength({ min: 1, max: 50 }).escape(),
  body('lastName').notEmpty().trim().isLength({ min: 1, max: 50 }).escape(),
  body('phoneNumber').optional().isMobilePhone().escape(),
  body('email').optional().isEmail().normalizeEmail(),
  body('dateOfBirth').optional().isISO8601().toDate(),
  body('chiefComplaint').notEmpty().trim().isLength({ min: 1, max: 500 }).escape(),
  body('symptoms').optional().isLength({ max: 1000 }).escape(),
  body('painLevel').optional().isInt({ min: 0, max: 10 }),
];

export const validateLoginData = [
  body('username').notEmpty().trim().isLength({ min: 3, max: 50 }).escape(),
  body('password').notEmpty().isLength({ min: 6, max: 100 }),
  body('role').isIn(['doctor', 'nurse', 'admin']).escape(),
];

export const validateMedicalStaffRequest = [
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty().trim().isLength({ min: 1, max: 50 }).escape(),
  body('lastName').notEmpty().trim().isLength({ min: 1, max: 50 }).escape(),
  body('role').isIn(['doctor', 'nurse']).escape(),
  body('hospitalAffiliation').notEmpty().trim().isLength({ min: 1, max: 100 }).escape(),
  body('medicalLicense').notEmpty().trim().isLength({ min: 1, max: 50 }).escape(),
];

/**
 * Validation Error Handler
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Security Logger
 */
export const securityLogger = (req, res, next) => {
  // Log security-relevant events
  const securityEvents = [
    'login', 'logout', 'failed-login', 'password-change',
    'admin-access', 'data-export', 'sensitive-operation'
  ];

  const originalSend = res.send;
  res.send = function(data) {
    // Log failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.log(`🔒 Security Alert: ${req.method} ${req.originalUrl} - ${res.statusCode} - IP: ${req.ip} - UA: ${req.get('User-Agent')}`);
    }
    
    originalSend.call(this, data);
  };

  next();
};

/**
 * Error Handler - Doesn't expose sensitive information
 */
export const secureErrorHandler = (err, req, res, next) => {
  console.error('🚨 Server Error:', err);

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again later.'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
};

/**
 * Medical Staff Authentication Check
 */
export const requireMedicalStaff = (req, res, next) => {
  if (!req.user || !['doctor', 'nurse', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Medical staff access required' });
  }
  next();
};

/**
 * Admin Only Access
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
};

export default {
  basicSecurity,
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  sanitizeInput,
  verifyToken,
  generateToken,
  hashPassword,
  comparePassword,
  validatePatientData,
  validateLoginData,
  validateMedicalStaffRequest,
  handleValidationErrors,
  securityLogger,
  secureErrorHandler,
  requireMedicalStaff,
  requireAdmin,
  SECURITY_CONFIG
};