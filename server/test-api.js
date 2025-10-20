import { initializeDatabase, createPatient, getAllPatients } from './database.js';

// Simple test to verify database functionality
async function testDatabase() {
  console.log('Testing database functionality...');
  
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Test creating a patient with all form fields
    const testPatient = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: null,
      gender: 'male',
      phoneNumber: null,
      email: null,
      address: null,
      emergencyContact: null,
      emergencyPhone: null,
      medicalHistory: null,
      currentMedications: null,
      allergies: null,
      chiefComplaint: 'motor-vehicle-accident',
      symptoms: null,
      painLevel: null,
      vitalSigns: JSON.stringify({
        location: { latitude: 18.0179, longitude: -76.8099 },
        estimatedTravelTime: '15 minutes'
      }),
      triageLevel: 'moderate',
      insurance: null,
      // Form-specific fields
      ageRange: '31-50',
      trn: 'TEST123',
      incident: 'motor-vehicle-accident',
      customIncident: null,
      patientStatus: 'conscious',
      transportationMode: 'ambulance',
      submittedAt: new Date().toISOString(),
      originalFormId: 'form_' + Date.now()
    };
    
    const createdPatient = await createPatient(testPatient);
    console.log('✅ Test patient created:', createdPatient.id);
    
    // Test retrieving patients
    const patients = await getAllPatients();
    console.log(`✅ Retrieved ${patients.length} patient(s) from database`);
    
    console.log('🎉 All tests passed! Database is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabase();