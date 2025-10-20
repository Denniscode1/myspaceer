import { db, logEvent } from '../database-enhanced.js';
import { notificationService } from './notificationService.js';
import crypto from 'crypto';
import { hashPassword, comparePassword } from '../middleware/security.js';

/**
 * Medical Staff Service
 * Handles secure credential requests and access management for medical personnel
 */
export class MedicalStaffService {
  constructor() {
    this.credentialExpiryHours = 24; // Credentials expire after 24 hours
    this.maxRequestsPerEmail = 3; // Max requests per email per day
    this.initialize();
  }

  async initialize() {
    console.log('Initializing Medical Staff Service...');
    await this.createTables();
    await this.createDefaultUser();
  }

  /**
   * Create necessary database tables
   */
  async createTables() {
    const createStaffRequestsTable = `
      CREATE TABLE IF NOT EXISTS medical_staff_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        hospital_affiliation TEXT NOT NULL,
        medical_license TEXT NOT NULL,
        department TEXT,
        request_ip TEXT,
        status TEXT DEFAULT 'pending',
        username TEXT,
        password_hash TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        last_login DATETIME
      )
    `;

    const createStaffSessionsTable = `
      CREATE TABLE IF NOT EXISTS medical_staff_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT
      )
    `;

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(createStaffRequestsTable, (err) => {
          if (err) {
            console.error('Error creating medical_staff_requests table:', err);
            reject(err);
            return;
          }
        });

        db.run(createStaffSessionsTable, (err) => {
          if (err) {
            console.error('Error creating medical_staff_sessions table:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Create default user for development/testing
   */
  async createDefaultUser() {
    try {
      // Check if default user already exists
      const existingUser = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM medical_staff_requests WHERE email = ?', 
          ['admin@hospital.com'], 
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingUser) {
        console.log('✅ Default medical staff user already exists');
        return;
      }

      // Create default credentials that don't expire
      const defaultPassword = 'MySpaceER2024!';
      const passwordHash = await hashPassword(defaultPassword);
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 1); // 1 year from now

      const sql = `
        INSERT INTO medical_staff_requests (
          email, role, first_name, last_name, hospital_affiliation, 
          medical_license, department, request_ip, username, 
          password_hash, expires_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `;

      await new Promise((resolve, reject) => {
        db.run(sql, [
          'admin@hospital.com',
          'doctor',
          'Admin',
          'User',
          'Development Hospital',
          'DEV123456',
          'Emergency Medicine',
          '127.0.0.1',
          'admin',
          passwordHash,
          farFutureDate.toISOString()
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });

      console.log('✅ Default medical staff user created:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Role: doctor');
      console.log('   Email: admin@hospital.com');
      
    } catch (error) {
      console.error('Failed to create default user:', error);
    }
  }

  /**
   * Process medical staff access request
   */
  async processAccessRequest(requestData, clientIP) {
    try {
      const { email, role, firstName, lastName, hospitalAffiliation, medicalLicense, department } = requestData;

      // Validate request
      const validation = await this.validateRequest(email, clientIP);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Generate secure credentials
      const credentials = this.generateCredentials(firstName, lastName, role);

      // Store request in database
      const requestId = await this.storeRequest({
        email,
        role,
        firstName,
        lastName,
        hospitalAffiliation,
        medicalLicense,
        department,
        requestIP: clientIP,
        username: credentials.username,
        passwordHash: credentials.passwordHash,
        expiresAt: credentials.expiresAt
      });

      // Send credentials via email
      await this.sendCredentialsEmail(requestData, credentials);

      // Log the event
      logEvent('medical_staff_request', 'medical_staff_requests', null, null, null, {
        request_id: requestId,
        email,
        role,
        hospital: hospitalAffiliation
      });

      return {
        success: true,
        message: 'Access request processed successfully. Check your email for login credentials.',
        requestId,
        expiresIn: '24 hours'
      };

    } catch (error) {
      console.error('Failed to process access request:', error);
      throw error;
    }
  }

  /**
   * Validate access request
   */
  async validateRequest(email, clientIP) {
    // Check email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { valid: false, message: 'Invalid email address' };
    }

    // Check for recent requests from this email
    const recentRequests = await this.getRecentRequests(email);
    if (recentRequests >= this.maxRequestsPerEmail) {
      return { 
        valid: false, 
        message: 'Too many requests. Please wait 24 hours before requesting again.' 
      };
    }

    // Check for suspicious IP activity (optional enhancement)
    // Could implement rate limiting by IP here

    return { valid: true };
  }

  /**
   * Generate secure credentials
   */
  generateCredentials(firstName, lastName, role) {
    // Generate username based on name and role
    const baseUsername = `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}_${role}`;
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const username = `${baseUsername}${randomSuffix}`;

    // Generate secure password
    const password = this.generateSecurePassword();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.credentialExpiryHours);

    return {
      username,
      password,
      passwordHash,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Generate secure password
   */
  generateSecurePassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill remaining positions
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Store request in database
   */
  async storeRequest(requestData) {
    const sql = `
      INSERT INTO medical_staff_requests (
        email, role, first_name, last_name, hospital_affiliation, 
        medical_license, department, request_ip, username, 
        password_hash, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    return new Promise((resolve, reject) => {
      db.run(sql, [
        requestData.email,
        requestData.role,
        requestData.firstName,
        requestData.lastName,
        requestData.hospitalAffiliation,
        requestData.medicalLicense,
        requestData.department,
        requestData.requestIP,
        requestData.username,
        requestData.passwordHash,
        requestData.expiresAt
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Send credentials via email
   */
  async sendCredentialsEmail(requestData, credentials) {
    const { email, firstName, lastName, role, hospitalAffiliation } = requestData;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 1.8rem;">🏥 MySpaceER Access Granted</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Emergency Response Dashboard</p>
        </div>
        
        <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px; background: #fff;">
          <p style="font-size: 1.1rem; margin: 0 0 20px;"><strong>Dear Dr./Nurse ${firstName} ${lastName},</strong></p>
          
          <p>Your access request for the MySpaceER Emergency Response Dashboard has been approved. Below are your secure login credentials:</p>
          
          <div style="background: #f8f9ff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px; color: #667eea; font-size: 1.2rem;">🔐 Your Login Credentials</h3>
            <div style="font-family: 'Courier New', monospace; background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
              <p style="margin: 5px 0;"><strong>Username:</strong> <span style="color: #2196F3; font-weight: bold;">${credentials.username}</span></p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <span style="color: #FF5722; font-weight: bold;">${credentials.password}</span></p>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #856404;">⚠️ Important Security Information</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>These credentials expire in <strong>24 hours</strong></li>
              <li>Do not share your login information with anyone</li>
              <li>Change your password after first login (recommended)</li>
              <li>Log out when finished to maintain security</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; border: 1px solid #c8e6c9; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #2e7d32;">✅ Your Verified Information</h4>
            <p style="margin: 5px 0; color: #2e7d32;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            <p style="margin: 5px 0; color: #2e7d32;"><strong>Hospital:</strong> ${hospitalAffiliation}</p>
            <p style="margin: 5px 0; color: #2e7d32;"><strong>Email:</strong> ${email}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🚀 Access Dashboard Now
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
          
          <div style="font-size: 0.9rem; color: #666;">
            <h4 style="color: #667eea; margin-bottom: 10px;">📋 How to Login:</h4>
            <ol style="padding-left: 20px;">
              <li>Go to the MySpaceER homepage</li>
              <li>Click "Medical Staff Access" at the bottom</li>
              <li>Select your role (${role.charAt(0).toUpperCase() + role.slice(1)})</li>
              <li>Enter your username and password exactly as shown above</li>
              <li>Click "Login" to access the dashboard</li>
            </ol>
          </div>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 25px; font-size: 0.85rem; color: #666; text-align: center;">
            <p style="margin: 0;">This is an automated message from MySpaceER Emergency Triage System.</p>
            <p style="margin: 5px 0 0;">For security reasons, please do not reply to this email.</p>
            <p style="margin: 5px 0 0;"><strong>For support:</strong> Contact your hospital's IT department</p>
          </div>
        </div>
      </div>
    `;

    // Use the existing notification service to send the email
    return await notificationService.queueNotification(
      null, // no report ID for this type of notification
      'medical_staff_credentials',
      email,
      emailContent,
      'urgent'
    );
  }

  /**
   * Get recent requests count for email
   */
  async getRecentRequests(email) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM medical_staff_requests 
      WHERE email = ? AND created_at >= datetime('now', '-24 hours')
    `;

    return new Promise((resolve, reject) => {
      db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  /**
   * Validate login credentials
   */
  async validateLogin(username, password, role) {
    try {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      const sql = `
        SELECT * FROM medical_staff_requests 
        WHERE username = ? AND password_hash = ? AND role = ? 
        AND status = 'active' AND expires_at > datetime('now')
      `;

      const user = await new Promise((resolve, reject) => {
        db.get(sql, [username, passwordHash, role], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      if (!user) {
        return { valid: false, message: 'Invalid credentials or access expired' };
      }

      // Update last login
      await this.updateLastLogin(user.id);

      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          hospitalAffiliation: user.hospital_affiliation,
          email: user.email
        }
      };

    } catch (error) {
      console.error('Login validation error:', error);
      return { valid: false, message: 'Login validation failed' };
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    const sql = 'UPDATE medical_staff_requests SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    
    return new Promise((resolve, reject) => {
      db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * Get all valid credentials (admin function)
   */
  async getValidCredentials() {
    const sql = `
      SELECT username, role, first_name, last_name, hospital_affiliation, 
             email, created_at, expires_at, last_login
      FROM medical_staff_requests 
      WHERE status = 'active' AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `;

    return new Promise((resolve, reject) => {
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Clean up expired credentials
   */
  async cleanupExpiredCredentials() {
    const sql = `
      UPDATE medical_staff_requests 
      SET status = 'expired' 
      WHERE status = 'active' AND expires_at <= datetime('now')
    `;

    return new Promise((resolve, reject) => {
      db.run(sql, [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Cleaned up ${this.changes} expired medical staff credentials`);
          resolve({ expired: this.changes });
        }
      });
    });
  }

  /**
   * Get service statistics
   */
  async getServiceStats() {
    const sql = `
      SELECT 
        status,
        role,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM medical_staff_requests 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY status, role, DATE(created_at)
      ORDER BY created_at DESC
    `;

    return new Promise((resolve, reject) => {
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            weekly_stats: rows,
            generated_at: new Date().toISOString()
          });
        }
      });
    });
  }
}

// Create singleton instance
export const medicalStaffService = new MedicalStaffService();

// Set up periodic cleanup (every hour)
setInterval(() => {
  medicalStaffService.cleanupExpiredCredentials().catch(err => {
    console.error('Error during credential cleanup:', err);
  });
}, 60 * 60 * 1000); // 1 hour