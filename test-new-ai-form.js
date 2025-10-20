#!/usr/bin/env node

/**
 * Test New AI Form - Submit patients without manual criticality selection
 */

const API_BASE = 'http://localhost:3001/api';

async function testNewAIForm() {
  console.log('🤖 Testing New AI-Powered Form (No Manual Criticality)\n');
  
  const testPatients = [
    {
      name: 'Sarah Emergency',
      gender: 'female',
      age_range: '31-50',
      incident_type: 'shooting',
      incident_description: 'Patient has been shot in the chest area. Heavy bleeding, patient is unconscious and not responding to voice. Pulse is weak and rapid, breathing is shallow. This is a life-threatening emergency requiring immediate surgical intervention.',
      patient_status: 'unconscious',
      transportation_mode: 'ambulance',
      latitude: 17.9714,
      longitude: -76.7931,
      contact_email: 'emergency@test.com',
      contact_phone: '+18761234567'
    },
    {
      name: 'Mike Traffic Accident',
      gender: 'male',
      age_range: '31-50', 
      incident_type: 'motor-vehicle-accident',
      incident_description: 'Head-on collision at high speed. Patient conscious but complaining of severe chest pain and difficulty breathing. Possible broken ribs and internal injuries. Blood pressure dropping, patient becoming pale.',
      patient_status: 'conscious',
      transportation_mode: 'ambulance',
      latitude: 17.9800,
      longitude: -76.7850,
      contact_email: 'mike@test.com'
    },
    {
      name: 'Anna Minor Cut',
      gender: 'female',
      age_range: '11-30',
      incident_type: 'other',
      customIncident: 'Kitchen accident',
      incident_description: 'Small cut on finger from kitchen knife while cooking. Bleeding has been controlled with pressure. Patient is alert, walking, and in no distress. Wound needs cleaning and possibly a few stitches.',
      patient_status: 'conscious',
      transportation_mode: 'self-carry',
      latitude: 18.0000,
      longitude: -76.7500,
      contact_phone: '+18769876543'
    },
    {
      name: 'Robert Heart Attack',
      gender: 'male', 
      age_range: '51+',
      incident_type: 'heart-attack',
      incident_description: 'Patient experiencing severe chest pain radiating to left arm, sweating profusely, nausea, and shortness of breath. Classic heart attack symptoms. Patient has history of high blood pressure and diabetes.',
      patient_status: 'conscious',
      transportation_mode: 'ambulance',
      latitude: 17.9750,
      longitude: -76.7800,
      contact_email: 'robert@test.com',
      emergency_contact_name: 'Mary Wilson',
      emergency_contact_phone: '+18765555555'
    }
  ];

  console.log(`📝 Submitting ${testPatients.length} patients with detailed AI descriptions...\n`);

  const submittedPatients = [];

  for (let i = 0; i < testPatients.length; i++) {
    const patient = testPatients[i];
    console.log(`${i + 1}. Submitting: ${patient.name}`);
    console.log(`   📋 Incident: ${patient.incident_type}`);
    console.log(`   🎯 Expected AI Priority: ${getExpectedPriority(patient)}`);
    console.log(`   📝 Description: ${patient.incident_description.substring(0, 80)}...`);
    
    try {
      const response = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`   ✅ Submitted: ${result.report_id}`);
        submittedPatients.push({
          ...result,
          expectedPriority: getExpectedPriority(patient),
          patientName: patient.name
        });
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log('');
  }

  if (submittedPatients.length === 0) {
    console.log('❌ No patients were submitted successfully. Check if server is running.');
    return;
  }

  // Wait for AI processing
  console.log('⏳ Waiting for AI processing and queue management...');
  await sleep(8000); // Wait 8 seconds for AI processing

  // Check queue status
  console.log('\n🏥 Checking updated queue status...\n');

  try {
    const hospitalsResponse = await fetch(`${API_BASE}/hospitals`);
    const hospitalsData = await hospitalsResponse.json();

    for (const hospital of hospitalsData.data) {
      const queueResponse = await fetch(`${API_BASE}/queue/${hospital.hospital_id}`);
      const queueData = await queueResponse.json();

      if (queueData.success && queueData.data.total_patients > 0) {
        console.log(`🏥 ${hospital.name}:`);
        console.log(`   📊 Total patients: ${queueData.data.total_patients}`);
        console.log(`   🤖 Source: ${queueData.data.source}`);
        console.log(`   👥 Queue (ordered by AI priority):`);
        
        queueData.data.queue_items.forEach((queuePatient) => {
          const submitted = submittedPatients.find(p => p.report_id === queuePatient.report_id);
          const isNewPatient = submitted ? '🆕' : '   ';
          
          console.log(`   ${isNewPatient} ${queuePatient.queue_position}. ${queuePatient.name}`);
          console.log(`      🎯 AI Criticality: ${queuePatient.criticality}`);
          
          if (submitted) {
            const expectedMatch = queuePatient.criticality === submitted.expectedPriority ? '✅' : '❓';
            console.log(`      ${expectedMatch} Expected: ${submitted.expectedPriority}`);
          }
          
          if (queuePatient.ai_confidence) {
            console.log(`      🤖 AI Confidence: ${(queuePatient.ai_confidence * 100).toFixed(1)}%`);
          }
          console.log(`      ⏱️  Wait Time: ${Math.round(queuePatient.estimated_wait_time / 60)} min`);
          console.log('');
        });
        console.log('');
      }
    }

    console.log('🎉 AI Form Test Complete!\n');
    
    console.log('📊 AI Analysis Summary:');
    console.log(`   ✅ ${submittedPatients.length} patients submitted successfully`);
    console.log(`   🤖 All processed by AI triage system`);
    console.log(`   📋 Automatic queue prioritization based on incident descriptions`);
    console.log(`   🏥 Intelligent hospital assignment`);
    console.log(`   ❌ NO manual criticality selection required!`);

  } catch (error) {
    console.error('❌ Failed to check queue status:', error.message);
  }
}

function getExpectedPriority(patient) {
  const description = patient.incident_description.toLowerCase();
  
  if (description.includes('unconscious') || description.includes('life-threatening') || 
      description.includes('heavy bleeding') || patient.incident_type === 'shooting') {
    return 'Critical';
  }
  
  if (description.includes('chest pain') || description.includes('difficulty breathing') ||
      patient.incident_type === 'heart-attack' || patient.incident_type === 'motor-vehicle-accident') {
    return 'High';
  }
  
  if (description.includes('minor') || description.includes('small cut')) {
    return 'Low';
  }
  
  return 'Moderate';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

testNewAIForm().catch(console.error);