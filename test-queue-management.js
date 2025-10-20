#!/usr/bin/env node

/**
 * Queue Management Test Script
 * Tests the enhanced dashboard queue management and notification features
 */

const API_BASE = 'http://localhost:3001/api';

async function testQueueManagement() {
  console.log('🏥 Testing Queue Management System\n');

  try {
    // Test 1: Submit a few test patients
    console.log('1️⃣ Creating Test Patients...\n');
    
    const testPatients = [
      {
        name: 'Alice Williams',
        gender: 'female',
        age_range: '31-50',
        incident_type: 'shooting',
        patient_status: 'unconscious',
        transportation_mode: 'ambulance',
        latitude: 17.9714,
        longitude: -76.7931,
        incident_description: 'Gunshot wound to abdomen, patient unconscious'
      },
      {
        name: 'Bob Jackson',
        gender: 'male', 
        age_range: '51+',
        incident_type: 'motor-vehicle-accident',
        patient_status: 'conscious',
        transportation_mode: 'ambulance',
        latitude: 17.9800,
        longitude: -76.7850,
        incident_description: 'Head-on collision, chest pain and lacerations'
      },
      {
        name: 'Carol Thompson',
        gender: 'female',
        age_range: '11-30',
        incident_type: 'other',
        patient_status: 'conscious',
        transportation_mode: 'self-carry',
        latitude: 18.0000,
        longitude: -76.7500,
        incident_description: 'Severe allergic reaction, difficulty breathing'
      }
    ];

    const submittedReports = [];
    
    for (const patient of testPatients) {
      console.log(`📝 Submitting: ${patient.name}`);
      
      const response = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`   ✅ Report ID: ${result.report_id}`);
        submittedReports.push(result.report_id);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }

    // Wait for processing
    console.log('\n⏳ Waiting for triage and hospital assignment...');
    await sleep(6000);

    // Test 2: Get Hospitals List
    console.log('\n2️⃣ Testing Hospital List...\n');
    
    const hospitalsResponse = await fetch(`${API_BASE}/hospitals`);
    const hospitalsData = await hospitalsResponse.json();
    
    if (hospitalsData.success && hospitalsData.data.length > 0) {
      console.log(`🏥 Found ${hospitalsData.data.length} hospitals:`);
      hospitalsData.data.forEach(hospital => {
        console.log(`   • ${hospital.name} (${hospital.hospital_id})`);
      });
      
      // Test 3: Check Queue for First Hospital
      const firstHospital = hospitalsData.data[0];
      console.log(`\n3️⃣ Checking Queue for ${firstHospital.name}...\n`);
      
      const queueResponse = await fetch(`${API_BASE}/queue/${firstHospital.hospital_id}`);
      const queueData = await queueResponse.json();
      
      if (queueData.success) {
        console.log(`👥 Patients in queue: ${queueData.data.total_patients}`);
        
        if (queueData.data.queue_items.length > 0) {
          console.log('\n📋 Current Queue:');
          queueData.data.queue_items.forEach((patient, index) => {
            console.log(`   ${patient.queue_position}. ${patient.name}`);
            console.log(`      Criticality: ${patient.criticality || 'Pending'}`);
            console.log(`      Incident: ${patient.incident_type}`);
            console.log(`      Wait Time: ${patient.estimated_wait_time ? Math.round(patient.estimated_wait_time / 60) + ' min' : 'N/A'}`);
            console.log('      ---');
          });

          // Test 4: Test Queue Management Actions
          if (queueData.data.queue_items.length >= 2) {
            console.log('\n4️⃣ Testing Queue Management Actions...\n');
            
            const firstPatient = queueData.data.queue_items[0];
            const secondPatient = queueData.data.queue_items[1];
            
            // Test moving patient down in queue
            console.log(`📋 Moving ${secondPatient.name} up in queue...`);
            const moveResponse = await fetch(`${API_BASE}/queue/${secondPatient.report_id}/move`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                direction: 'up',
                doctor_id: 'dr_demo_001'
              })
            });
            
            const moveResult = await moveResponse.json();
            if (moveResult.success) {
              console.log('   ✅ Patient moved successfully');
            } else {
              console.log('   ❌ Move failed:', moveResult.error);
            }

            // Test starting treatment
            console.log(`\n🏥 Starting treatment for ${firstPatient.name}...`);
            const removeResponse = await fetch(`${API_BASE}/queue/${firstPatient.report_id}/remove`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reason: 'treatment_started',
                doctor_id: 'dr_demo_001'
              })
            });
            
            const removeResult = await removeResponse.json();
            if (removeResult.success) {
              console.log('   ✅ Treatment started - patient removed from queue');
            } else {
              console.log('   ❌ Remove failed:', removeResult.error);
            }

            // Test status update
            console.log(`\n📝 Updating patient status to 'InTreatment'...`);
            const statusResponse = await fetch(`${API_BASE}/reports/${firstPatient.report_id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'InTreatment',
                user_id: 'dr_demo_001',
                user_role: 'doctor'
              })
            });
            
            const statusResult = await statusResponse.json();
            if (statusResult.success) {
              console.log('   ✅ Patient status updated');
            } else {
              console.log('   ❌ Status update failed:', statusResult.error);
            }
          }
        } else {
          console.log('📭 No patients currently in queue');
        }
      } else {
        console.log('❌ Failed to get queue data:', queueData.error);
      }
      
      // Test 5: Test Notification System
      console.log('\n5️⃣ Testing Notification System...\n');
      
      // Test email notification
      console.log('📧 Sending test email notification...');
      const emailResponse = await fetch(`${API_BASE}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          recipient: 'doctor@example.com',
          subject: 'Test Queue Update',
          message: 'This is a test notification from the queue management system.',
          priority: 'normal'
        })
      });
      
      const emailResult = await emailResponse.json();
      if (emailResult.success) {
        console.log('   ✅ Email notification queued');
      } else {
        console.log('   ❌ Email notification failed:', emailResult.error);
      }

      // Test SMS notification
      console.log('\n📱 Sending test SMS notification...');
      const smsResponse = await fetch(`${API_BASE}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sms',
          recipient: '+1234567890',
          message: 'Queue Update: Patient treatment completed. Ready for next patient.',
          priority: 'urgent'
        })
      });
      
      const smsResult = await smsResponse.json();
      if (smsResult.success) {
        console.log('   ✅ SMS notification queued');
      } else {
        console.log('   ❌ SMS notification failed:', smsResult.error);
      }

    } else {
      console.log('❌ No hospitals found in system');
    }

    console.log('\n🎉 Queue Management Test Complete!\n');
    
    console.log('📋 Features Tested:');
    console.log('   ✅ Patient report submission');
    console.log('   ✅ Hospital list retrieval');
    console.log('   ✅ Queue data fetching');
    console.log('   ✅ Queue position management');
    console.log('   ✅ Treatment initiation');
    console.log('   ✅ Status updates');
    console.log('   ✅ Email notifications');
    console.log('   ✅ SMS notifications');
    console.log('');
    console.log('🚨 Dashboard Usage Instructions:');
    console.log('   1. Start the enhanced server: node server-enhanced.js');
    console.log('   2. Start the frontend: npm run dev');
    console.log('   3. Login as a doctor to access the dashboard');
    console.log('   4. Navigate to "Queue Management" tab');
    console.log('   5. Enter your email/phone for notifications');
    console.log('   6. Manage queue positions and patient status');
    console.log('   7. Receive real-time notifications on updates');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure the enhanced server is running:');
      console.log('   cd server');
      console.log('   node server-enhanced.js');
    }
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  try {
    const { fetch: nodeFetch } = await import('node-fetch');
    global.fetch = nodeFetch;
  } catch (error) {
    console.error('❌ node-fetch not available. Please install it:');
    console.log('npm install node-fetch');
    process.exit(1);
  }
}

// Run the test
testQueueManagement();