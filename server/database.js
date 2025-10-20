import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection
const dbPath = join(__dirname, 'patients.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create patients table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          dateOfBirth TEXT,
          gender TEXT,
          phoneNumber TEXT,
          email TEXT,
          address TEXT,
          emergencyContact TEXT,
          emergencyPhone TEXT,
          medicalHistory TEXT,
          currentMedications TEXT,
          allergies TEXT,
          chiefComplaint TEXT,
          symptoms TEXT,
          painLevel INTEGER,
          vitalSigns TEXT,
          triageLevel TEXT,
          insurance TEXT,
          ageRange TEXT,
          trn TEXT,
          incident TEXT,
          customIncident TEXT,
          patientStatus TEXT,
          transportationMode TEXT,
          submittedAt DATETIME,
          originalFormId TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating patients table:', err);
          reject(err);
        } else {
          // Add missing columns to existing table if they don't exist
          const alterCommands = [
            'ALTER TABLE patients ADD COLUMN ageRange TEXT',
            'ALTER TABLE patients ADD COLUMN trn TEXT',
            'ALTER TABLE patients ADD COLUMN incident TEXT', 
            'ALTER TABLE patients ADD COLUMN customIncident TEXT',
            'ALTER TABLE patients ADD COLUMN patientStatus TEXT',
            'ALTER TABLE patients ADD COLUMN transportationMode TEXT',
            'ALTER TABLE patients ADD COLUMN submittedAt DATETIME',
            'ALTER TABLE patients ADD COLUMN originalFormId TEXT'
          ];
          
          let completedAlters = 0;
          const totalAlters = alterCommands.length;
          
          alterCommands.forEach((command) => {
            db.run(command, (alterErr) => {
              // Ignore errors for columns that already exist
              completedAlters++;
              if (completedAlters === totalAlters) {
                console.log('Database initialized successfully');
                resolve();
              }
            });
          });
          
          // If no alterCommands, resolve immediately
          if (totalAlters === 0) {
            console.log('Database initialized successfully');
            resolve();
          }
        }
      });
    });
  });
};

// Database operations
export const getAllPatients = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM patients ORDER BY createdAt DESC', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getPatientById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM patients WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const createPatient = (patientData) => {
  return new Promise((resolve, reject) => {
    const {
      firstName, lastName, dateOfBirth, gender, phoneNumber, email, address,
      emergencyContact, emergencyPhone, medicalHistory, currentMedications,
      allergies, chiefComplaint, symptoms, painLevel, vitalSigns, triageLevel, insurance,
      ageRange, trn, incident, customIncident, patientStatus, transportationMode,
      submittedAt, originalFormId
    } = patientData;

    const sql = `
      INSERT INTO patients (
        firstName, lastName, dateOfBirth, gender, phoneNumber, email, address,
        emergencyContact, emergencyPhone, medicalHistory, currentMedications,
        allergies, chiefComplaint, symptoms, painLevel, vitalSigns, triageLevel, insurance,
        ageRange, trn, incident, customIncident, patientStatus, transportationMode,
        submittedAt, originalFormId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      firstName, lastName, dateOfBirth, gender, phoneNumber, email, address,
      emergencyContact, emergencyPhone, medicalHistory, currentMedications,
      allergies, chiefComplaint, symptoms, painLevel, vitalSigns, triageLevel, insurance,
      ageRange, trn, incident, customIncident, patientStatus, transportationMode,
      submittedAt, originalFormId
    ];

    db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...patientData });
      }
    });
  });
};

export const updatePatient = (id, patientData) => {
  return new Promise((resolve, reject) => {
    const {
      firstName, lastName, dateOfBirth, gender, phoneNumber, email, address,
      emergencyContact, emergencyPhone, medicalHistory, currentMedications,
      allergies, chiefComplaint, symptoms, painLevel, vitalSigns, triageLevel, insurance,
      ageRange, trn, incident, customIncident, patientStatus, transportationMode,
      submittedAt, originalFormId
    } = patientData;

    const sql = `
      UPDATE patients SET
        firstName = ?, lastName = ?, dateOfBirth = ?, gender = ?, phoneNumber = ?,
        email = ?, address = ?, emergencyContact = ?, emergencyPhone = ?,
        medicalHistory = ?, currentMedications = ?, allergies = ?, chiefComplaint = ?,
        symptoms = ?, painLevel = ?, vitalSigns = ?, triageLevel = ?, insurance = ?,
        ageRange = ?, trn = ?, incident = ?, customIncident = ?, patientStatus = ?,
        transportationMode = ?, submittedAt = ?, originalFormId = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      firstName, lastName, dateOfBirth, gender, phoneNumber, email, address,
      emergencyContact, emergencyPhone, medicalHistory, currentMedications,
      allergies, chiefComplaint, symptoms, painLevel, vitalSigns, triageLevel, insurance,
      ageRange, trn, incident, customIncident, patientStatus, transportationMode,
      submittedAt, originalFormId, id
    ];

    db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id, ...patientData });
      }
    });
  });
};

export const deletePatient = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM patients WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deletedId: id, changes: this.changes });
      }
    });
  });
};

export { db };