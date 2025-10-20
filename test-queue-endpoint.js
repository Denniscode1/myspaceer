#!/usr/bin/env node

/**
 * Test Queue Endpoint - Check if patients show up in the queue
 */

const API_BASE = 'http://localhost:3001/api';

async function testQueueEndpoint() {
  console.log('🧪 Testing Queue Endpoint with AI Data\n');
  
  try {
    // Test 1: Get hospitals
    console.log('1️⃣ Getting hospitals...');
    const hospitalsResponse = await fetch(`${API_BASE}/hospitals`);
    const hospitalsData = await hospitalsResponse.json();
    
    if (!hospitalsData.success) {
      console.error('❌ Failed to get hospitals:', hospitalsData.error);
      return;
    }
    
    console.log(`✅ Found ${hospitalsData.data.length} hospitals:`);
    hospitalsData.data.forEach(hospital => {
      console.log(`   🏥 ${hospital.name} (${hospital.hospital_id})`);
    });
    
    // Test 2: Check each hospital's queue
    console.log('\n2️⃣ Checking queue for each hospital...\n');
    
    for (const hospital of hospitalsData.data) {
      console.log(`🏥 ${hospital.name}:`);
      
      try {
        const queueResponse = await fetch(`${API_BASE}/queue/${hospital.hospital_id}`);
        const queueData = await queueResponse.json();
        
        if (queueData.success) {
          console.log(`   📊 Total patients: ${queueData.data.total_patients}`);
          console.log(`   📋 Source: ${queueData.data.source || 'unknown'}`);
          
          if (queueData.data.queue_items.length > 0) {
            console.log(`   👥 Patients in queue:`);
            queueData.data.queue_items.forEach((patient, index) => {
              console.log(`      ${patient.queue_position}. ${patient.name}`);
              console.log(`         🎯 Criticality: ${patient.criticality || 'Not set'}`);
              console.log(`         📋 Incident: ${patient.incident_type}`);
              if (patient.incident_description) {
                console.log(`         📝 Description: ${patient.incident_description.substring(0, 60)}...`);
              }
              if (patient.ai_confidence) {
                console.log(`         🤖 AI Confidence: ${(patient.ai_confidence * 100).toFixed(1)}%`);
              }
              console.log(`         ⏱️  Wait Time: ${patient.estimated_wait_time ? Math.round(patient.estimated_wait_time / 60) + ' min' : 'N/A'}`);
              console.log(`         📅 Submitted: ${new Date(patient.submitted_at).toLocaleString()}`);
              console.log('');
            });
          } else {
            console.log(`   📭 No patients in queue`);
          }
        } else {
          console.log(`   ❌ Failed to get queue: ${queueData.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Queue request failed: ${error.message}`);
      }
      
      console.log('');
    }
    
    // Test 3: Check database directly
    console.log('3️⃣ Direct database check...\n');
    
    import('./verify-ai-results.js').then(() => {
      console.log('✅ Database verification complete');
    }).catch(error => {
      console.log('❌ Database verification failed:', error.message);
    });
    
    console.log('🎉 Queue endpoint test complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server');
      console.log('   node server-enhanced.js');
    }
  }
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  try {
    const { fetch: nodeFetch } = await import('node-fetch');
    global.fetch = nodeFetch;
  } catch (error) {
    console.log('ℹ️  node-fetch not available - please install: npm install node-fetch');
    process.exit(1);
  }
}

// Run the test
testQueueEndpoint().catch(console.error);