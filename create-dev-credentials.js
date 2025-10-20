import sqlite3 from 'sqlite3';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database setup
const dbPath = join(__dirname, 'server', 'emergency_system.db');
const db = new sqlite3.Database(dbPath);

/**
 * Create developer credentials for dashboard access
 */
async function createDeveloperCredentials() {
  console.log('🛠️  Creating Developer Credentials for MySpaceER Dashboard...\n');

  // Developer details
  const developerData = {
    email: 'developer@myspaceer.local',
    role: 'doctor', // Use doctor role for full access
    firstName: 'Developer',
    lastName: 'Admin',
    hospitalAffiliation: 'MySpaceER Development Team',
    medicalLicense: 'DEV-2024-001',
    department: 'Software Development',
    requestIP: '127.0.0.1'
  };

  // Generate credentials
  const credentials = generateDevCredentials(developerData.firstName, developerData.lastName, developerData.role);
  
  try {
    // Create medical_staff_requests table if it doesn't exist
    await createMedicalStaffTable();
    
    // Insert developer credentials
    const requestId = await insertDeveloperCredentials(developerData, credentials);
    
    console.log('✅ Developer credentials created successfully!\n');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('┌─────────────────────────────────────────┐');
    console.log(`│ Username: ${credentials.username.padEnd(27)} │`);
    console.log(`│ Password: ${credentials.password.padEnd(27)} │`);
    console.log(`│ Role:     ${'Doctor'.padEnd(27)} │`);
    console.log('└─────────────────────────────────────────┘\n');
    
    console.log('📋 HOW TO USE:');
    console.log('1. Start your server: npm run dev (or node server/index.js)');
    console.log('2. Go to your homepage');
    console.log('3. Click "Medical Staff Access" at the bottom');
    console.log('4. Select "Doctor" as role');
    console.log('5. Enter the username and password above');
    console.log('6. Click "Login" to access the dashboard\n');
    
    console.log('ℹ️  These credentials are valid for 24 hours from now.');
    console.log('ℹ️  Run this script again if credentials expire.\n');
    
    return { requestId, credentials };
    
  } catch (error) {
    console.error('❌ Error creating developer credentials:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Generate secure credentials for developer
 */
function generateDevCredentials(firstName, lastName, role) {
  // Generate username
  const baseUsername = `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}_${role}`;
  const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const username = `${baseUsername}${randomSuffix}`;

  // Generate secure password
  const password = generateSecurePassword();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  // Set expiration (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

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
function generateSecurePassword() {
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
 * Create medical staff table if it doesn't exist
 */
function createMedicalStaffTable() {
  return new Promise((resolve, reject) => {
    const sql = `
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
        status TEXT DEFAULT 'active',
        username TEXT,
        password_hash TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        last_login DATETIME
      )
    `;

    db.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Insert developer credentials into database
 */
function insertDeveloperCredentials(developerData, credentials) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO medical_staff_requests (
        email, role, first_name, last_name, hospital_affiliation, 
        medical_license, department, request_ip, username, 
        password_hash, expires_at, status, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `;

    db.run(sql, [
      developerData.email,
      developerData.role,
      developerData.firstName,
      developerData.lastName,
      developerData.hospitalAffiliation,
      developerData.medicalLicense,
      developerData.department,
      developerData.requestIP,
      credentials.username,
      credentials.passwordHash,
      credentials.expiresAt
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

// Run the script
createDeveloperCredentials()
  .then(() => {
    console.log('🎉 Setup complete! You can now access the dashboard.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });