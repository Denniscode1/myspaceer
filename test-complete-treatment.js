#!/usr/bin/env node

/**
 * Test Complete Treatment - Debug the completion flow
 */

const API_BASE = 'http://localhost:3001/api';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Treatment Flow\n');
  
  try {
    // Step 1: Get current queue to find a patient
    console.log('1️⃣ Getting current queue...');
    
    const hospitalsResponse = await fetch(`${API_BASE}/hospitals`);
    const hospitalsData = await hospitalsResponse.json();
    
    if (!hospitalsData.success) {
      console.error('❌ Failed to get hospitals');
      return;
    }
    
    let testPatient = null;
    let hospitalWithPatients = null;
    
    for (const hospital of hospitalsData.data) {
      const queueResponse = await fetch(`${API_BASE}/queue/${hospital.hospital_id}`);
      const queueData = await queueResponse.json();
      
      if (queueData.success && queueData.data.queue_items.length > 0) {
        testPatient = queueData.data.queue_items[0];
        hospitalWithPatients = hospital;
        console.log(`✅ Found test patient: ${testPatient.name} at ${hospital.name}`);
        console.log(`📋 Patient data:`, JSON.stringify(testPatient, null, 2));
        break;
      }
    }
    
    if (!testPatient) {
      console.log('❌ No patients found in any queue. Please add a patient first.');
      return;
    }
    
    // Step 2: Test the complete treatment endpoint
    console.log('\n2️⃣ Testing complete treatment endpoint...');
    
    const completionData = {
      report_id: testPatient.report_id,
      hospital_id: testPatient.hospital_id || hospitalWithPatients.hospital_id,
      treating_doctor_id: 'test_doctor_123',
      treating_doctor_name: 'Dr. Test McTester',
      treatment_notes: 'Test treatment completed successfully. Patient responded well to treatment.',
      treatment_outcome: 'successful',
      discharge_status: 'discharged',
      follow_up_required: false,
      follow_up_notes: '',
      patient_satisfaction_rating: 5,
      treatment_started_at: new Date(Date.now() - 30 * 60000).toISOString() // 30 minutes ago
    };
    
    console.log(`📤 Sending completion data:`, JSON.stringify(completionData, null, 2));
    
    const completeResponse = await fetch(`${API_BASE}/complete-treatment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(completionData)
    });
    
    console.log(`📈 Response status: ${completeResponse.status} ${completeResponse.statusText}`);
    
    const completeResult = await completeResponse.json();
    console.log(`📤 Response data:`, JSON.stringify(completeResult, null, 2));
    
    if (completeResult.success) {
      console.log('\n✅ Treatment completion successful!');
      
      // Step 3: Verify patient was removed from queue
      console.log('\n3️⃣ Verifying queue update...');
      
      const updatedQueueResponse = await fetch(`${API_BASE}/queue/${hospitalWithPatients.hospital_id}`);
      const updatedQueueData = await updatedQueueResponse.json();
      
      const stillInQueue = updatedQueueData.success && 
        updatedQueueData.data.queue_items.some(p => p.report_id === testPatient.report_id);
      
      if (stillInQueue) {
        console.log('⚠️  Patient still appears in queue');
      } else {
        console.log('✅ Patient successfully removed from queue');
      }
      
      // Step 4: Check treated patients
      console.log('\n4️⃣ Checking treated patients...');
      
      const treatedResponse = await fetch(`${API_BASE}/treated-patients`);
      const treatedData = await treatedResponse.json();
      
      if (treatedData.success) {
        const treatedPatient = treatedData.data.find(p => p.report_id === testPatient.report_id);
        if (treatedPatient) {
          console.log('✅ Patient found in treated section');
          console.log(`📋 Treatment outcome: ${treatedPatient.treatment_outcome}`);
          console.log(`📋 Discharge status: ${treatedPatient.discharge_status}`);
        } else {
          console.log('❌ Patient not found in treated section');
        }
      }
      
    } else {
      console.log('\n❌ Treatment completion failed:');
      console.log(`   Error: ${completeResult.error}`);
      if (completeResult.details) {
        console.log(`   Details: ${completeResult.details}`);
      }
      
      // Debug: Check what might be missing
      console.log('\n🔍 Debug Info:');
      console.log(`   Report ID: ${completionData.report_id || 'MISSING'}`);
      console.log(`   Hospital ID: ${completionData.hospital_id || 'MISSING'}`);
      console.log(`   Doctor ID: ${completionData.treating_doctor_id || 'MISSING'}`);
      
      // Try to get the specific patient report to see what's available
      try {
        const reportsResponse = await fetch(`${API_BASE}/reports`);
        const reportsData = await reportsResponse.json();
        
        if (reportsData.success) {
          const specificReport = reportsData.data.find(r => r.report_id === testPatient.report_id);
          if (specificReport) {
            console.log(`   Patient Report Found: ✅`);
            console.log(`   Patient Name: ${specificReport.name}`);
            console.log(`   Report Status: ${specificReport.status}`);
          } else {
            console.log(`   Patient Report Found: ❌`);
          }
        }
      } catch (debugError) {
        console.log(`   Report debug failed: ${debugError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔍 Error Details:', error);
  }
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  try {
    const { fetch: nodeFetch } = await import('node-fetch');
    global.fetch = nodeFetch;
  } catch (error) {
    console.log('ℹ️  node-fetch not available');
    process.exit(1);
  }
}

testCompleteFlow().catch(console.error);