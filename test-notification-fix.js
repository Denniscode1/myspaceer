import fetch from 'node-fetch';

/**
 * Test script to verify notification system works with real contact information
 */

const BASE_URL = 'http://localhost:3001';

// Test patient with real contact information
const testPatient = {
  name: 'Jane Test Patient',
  gender: 'female',
  age_range: '26-35',
  trn: '123456789013',
  incident_type: 'chest_pain',
  incident_description: 'Test notification system with real contact info',
  patient_status: 'conscious',
  transportation_mode: 'ambulance',
  contact_email: 'jane.test@gmail.com',
  contact_phone: '+1-876-555-1234',
  latitude: 18.0179,
  longitude: -76.8099,
  location_address: 'Test Location, Kingston'
};

async function makeRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    console.error(`Request failed: ${url}`, error);
    return { status: 500, data: { error: error.message } };
  }
}

async function testNotificationSystem() {
  console.log('🧪 Testing Notification System with Real Contact Info\n');
  
  let reportId;
  
  try {
    // Step 1: Submit a test patient report with real contact info
    console.log('📝 Step 1: Submitting test patient with email and phone...');
    const submitResponse = await makeRequest(`${BASE_URL}/api/reports`, 'POST', testPatient);
    
    if (submitResponse.status === 201) {
      reportId = submitResponse.data.report_id;
      console.log(`✅ Patient report created: ${reportId}`);
      console.log(`📧 Expected notifications to: ${testPatient.contact_email}`);
      console.log(`📱 Expected SMS notifications to: ${testPatient.contact_phone}\n`);
      
      // Wait for async processing to complete
      console.log('⏱️  Waiting for processing and notifications (10 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check the report status
      console.log('📋 Checking final report status...');
      const reportResponse = await makeRequest(`${BASE_URL}/api/reports/${reportId}`);
      
      if (reportResponse.status === 200) {
        const report = reportResponse.data.data;
        console.log(`✅ Report Status: ${report.status}`);
        console.log(`🏥 Hospital Assigned: ${report.hospital_name || 'None'}`);
        console.log(`📍 Queue Position: ${report.queue_position || 'Not in queue'}`);
        console.log(`👨‍⚕️ Assigned Doctor: ${report.assigned_doctor_name || 'Not assigned'}`);
      }
      
      console.log('\n📝 Important Notes:');
      console.log('1. Notifications are displayed in the server console (not actually sent)');
      console.log('2. Look for "📱 SMS to" and "📧 Email to" messages in the server logs');
      console.log('3. Contact information should now show real email/phone instead of placeholder');
      
    } else {
      console.error('❌ Failed to create patient report:', submitResponse.data);
      return;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup: Remove test patient if created
    if (reportId) {
      console.log('\n🧹 Cleanup: Removing test patient...');
      const deleteResponse = await makeRequest(
        `${BASE_URL}/api/reports/${reportId}`, 
        'DELETE', 
        {
          user_id: 'test_doctor',
          user_role: 'doctor'
        }
      );
      
      if (deleteResponse.status === 200) {
        console.log('✅ Test patient removed successfully');
      } else {
        console.log('⚠️  Could not remove test patient (may need manual cleanup)');
      }
    }
  }
  
  console.log('\n🎉 Notification Test Completed!');
}

// Check server health first
async function checkServerHealth() {
  console.log('🏥 Checking server health...');
  const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
  
  if (healthResponse.status === 200) {
    console.log('✅ Server is running and healthy\n');
    return true;
  } else {
    console.error('❌ Server is not responding properly');
    console.log('Please make sure the server is running on http://localhost:3001');
    return false;
  }
}

// Main test runner
async function runTest() {
  console.log('🚨 MySpaceER Notification System Test');
  console.log('====================================\n');
  
  const serverHealthy = await checkServerHealth();
  
  if (!serverHealthy) {
    process.exit(1);
  }
  
  await testNotificationSystem();
}

// Run the test
runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});