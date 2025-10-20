import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

// Test data for multiple patients
const testPatients = [
  {
    name: 'John Doe',
    gender: 'male',
    age_range: '31-50',
    incident_type: 'shooting',
    incident_description: 'Gunshot wound to chest, conscious but bleeding heavily',
    patient_status: 'conscious',
    transportation_mode: 'ambulance',
    contact_email: 'john.doe@test.com',
    contact_phone: '+1876123456'
  },
  {
    name: 'Jane Smith',
    gender: 'female',
    age_range: '11-30',
    incident_type: 'motor-vehicle-accident',
    incident_description: 'Car accident victim, head trauma, disoriented but conscious',
    patient_status: 'conscious',
    transportation_mode: 'ambulance',
    contact_email: 'jane.smith@test.com',
    contact_phone: '+1876234567'
  },
  {
    name: 'Bob Wilson',
    gender: 'male',
    age_range: '51+',
    incident_type: 'stabbing',
    incident_description: 'Knife wound to abdomen, severe pain but stable vitals',
    patient_status: 'conscious',
    transportation_mode: 'ambulance',
    contact_email: 'bob.wilson@test.com',
    contact_phone: '+1876345678'
  },
  {
    name: 'Alice Johnson',
    gender: 'female',
    age_range: '31-50',
    incident_type: 'other',
    incident_description: 'Severe allergic reaction, difficulty breathing but conscious',
    patient_status: 'conscious',
    transportation_mode: 'self-carry',
    contact_email: 'alice.johnson@test.com',
    contact_phone: '+1876456789'
  }
];

async function testQueueSystem() {
  console.log('🧪 Testing Queue System Fixes\n');
  
  try {
    // Step 1: Submit multiple patients
    console.log('📝 Step 1: Submitting multiple patients...');
    const submittedPatients = [];
    
    for (let i = 0; i < testPatients.length; i++) {
      const patient = testPatients[i];
      console.log(`   Submitting patient ${i + 1}: ${patient.name}`);
      
      const response = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      
      const result = await response.json();
      
      if (result.success) {
        submittedPatients.push(result.report_id);
        console.log(`   ✅ ${patient.name} submitted with ID: ${result.report_id}`);
      } else {
        console.log(`   ❌ Failed to submit ${patient.name}: ${result.error}`);
      }
      
      // Wait a bit between submissions to allow processing
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n✅ Submitted ${submittedPatients.length} patients successfully\n`);
    
    // Step 2: Wait for AI processing and check queue
    console.log('⏳ Step 2: Waiting for AI processing (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 3: Get hospitals and check queues
    console.log('🏥 Step 3: Checking hospital queues...');
    
    const hospitalsResponse = await fetch(`${BASE_URL}/api/hospitals`);
    const hospitalsResult = await hospitalsResponse.json();
    
    if (!hospitalsResult.success) {
      console.error('❌ Failed to get hospitals:', hospitalsResult.error);
      return;
    }
    
    const hospitals = hospitalsResult.data;
    console.log(`Found ${hospitals.length} hospitals`);
    
    for (const hospital of hospitals) {
      console.log(`\n🏥 Checking queue for: ${hospital.name}`);
      
      const queueResponse = await fetch(`${BASE_URL}/api/queue/${hospital.hospital_id}`);
      const queueResult = await queueResponse.json();
      
      if (queueResult.success) {
        const queueItems = queueResult.data.queue_items || [];
        console.log(`   📊 Queue size: ${queueItems.length} patients`);
        
        if (queueItems.length > 0) {
          console.log('   📋 Queue contents:');
          queueItems.forEach((patient, index) => {
            console.log(`      ${index + 1}. ${patient.name} (${patient.criticality || 'N/A'}) - Position: ${patient.queue_position}`);
          });
          
          // Step 4: Test start treatment for first patient
          if (queueItems.length >= 1) {
            console.log(`\n🏥 Step 4: Testing start treatment for first patient: ${queueItems[0].name}`);
            
            const startTreatmentResponse = await fetch(`${BASE_URL}/api/queue/${queueItems[0].report_id}/remove`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reason: 'treatment_started',
                doctor_id: 'test_doctor'
              })
            });
            
            const startResult = await startTreatmentResponse.json();
            
            if (startResult.success) {
              console.log(`   ✅ Successfully started treatment for ${queueItems[0].name}`);
              
              // Check updated queue
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const updatedQueueResponse = await fetch(`${BASE_URL}/api/queue/${hospital.hospital_id}`);
              const updatedQueueResult = await updatedQueueResponse.json();
              
              if (updatedQueueResult.success) {
                const updatedQueueItems = updatedQueueResult.data.queue_items || [];
                console.log(`   📊 Updated queue size: ${updatedQueueItems.length} patients`);
                
                if (updatedQueueItems.length > 0) {
                  console.log('   📋 Updated queue contents:');
                  updatedQueueItems.forEach((patient, index) => {
                    console.log(`      ${index + 1}. ${patient.name} (${patient.criticality || 'N/A'}) - Position: ${patient.queue_position}`);
                  });
                } else {
                  console.log('   📋 Queue is now empty');
                }
              }
            } else {
              console.log(`   ❌ Failed to start treatment: ${startResult.error}`);
            }
          }
        }
      } else {
        console.log(`   ❌ Failed to get queue: ${queueResult.error}`);
      }
    }
    
    console.log('\n🎉 Queue system test completed!');
    console.log('\n📊 Test Summary:');
    console.log(`   • Patients submitted: ${submittedPatients.length}`);
    console.log('   • Multiple patients in queue: Check the queue contents above');
    console.log('   • Start treatment functionality: Check the treatment test results above');
    console.log('\nIf you see multiple patients in the queue and successful treatment start, the fixes are working! 🚀');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
console.log('🚀 Starting queue system test...\n');
console.log('⚠️  Make sure your server is running on http://localhost:3001\n');

testQueueSystem().then(() => {
  console.log('\n✅ Test script completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test script failed:', error);
  process.exit(1);
});