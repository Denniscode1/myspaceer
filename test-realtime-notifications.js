import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

/**
 * Test script for real-time SMS and Email notifications
 * This will test the complete notification system with real providers
 */

const BASE_URL = 'http://localhost:3001';

// Test patient with YOUR contact information
const testPatient = {
  name: 'Test Patient for Real Notifications',
  gender: 'female',
  age_range: '26-35',
  trn: '123456789999',
  incident_type: 'chest_pain',
  incident_description: 'Testing real-time SMS and email notifications',
  patient_status: 'conscious',
  transportation_mode: 'ambulance',
  // 🚨 IMPORTANT: Replace these with YOUR actual contact information
  contact_email: 'your.email@gmail.com',  // ← Replace with your email
  contact_phone: '+1-876-555-1234',       // ← Replace with your phone
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

async function checkConfiguration() {
  console.log('🔧 Checking Notification Configuration...\n');
  
  const smsProvider = process.env.SMS_PROVIDER;
  const emailProvider = process.env.EMAIL_PROVIDER;
  const testMode = process.env.TEST_MODE;
  
  console.log(`📱 SMS Provider: ${smsProvider}`);
  console.log(`📧 Email Provider: ${emailProvider}`);
  console.log(`🧪 Test Mode: ${testMode}\n`);
  
  // Check Twilio configuration
  if (smsProvider === 'twilio') {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.log('❌ Twilio SMS not fully configured');
      console.log('   Missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER');
    } else {
      console.log('✅ Twilio SMS configured');
    }
  }
  
  // Check SMTP configuration
  if (emailProvider === 'smtp') {
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailHost || !emailUser || !emailPass) {
      console.log('❌ SMTP Email not fully configured');
      console.log('   Missing: EMAIL_HOST, EMAIL_USER, or EMAIL_PASS');
    } else {
      console.log('✅ SMTP Email configured');
    }
  }
  
  // Check test patient contact info
  if (testPatient.contact_email.includes('your.email') || testPatient.contact_phone.includes('555-1234')) {
    console.log('⚠️  Please update contact information in test script:');
    console.log(`   Email: ${testPatient.contact_email}`);
    console.log(`   Phone: ${testPatient.contact_phone}`);
    console.log('\n🚨 Update these with your real contact information to receive test notifications!\n');
  } else {
    console.log('✅ Test contact information configured');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function testNotificationSystem() {
  console.log('🚨 Testing Real-Time Notification System\n');
  
  let reportId;
  
  try {
    // Step 1: Submit patient report
    console.log('📝 Step 1: Submitting patient report...');
    const submitResponse = await makeRequest(`${BASE_URL}/api/reports`, 'POST', testPatient);
    
    if (submitResponse.status === 201) {
      reportId = submitResponse.data.report_id;
      console.log(`✅ Patient report created: ${reportId}`);
      console.log(`📧 Notifications will be sent to: ${testPatient.contact_email}`);
      console.log(`📱 SMS will be sent to: ${testPatient.contact_phone}\n`);
      
      // Wait for async processing
      console.log('⏱️  Waiting for processing (15 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
    } else {
      console.error('❌ Failed to create patient report:', submitResponse.data);
      return;
    }
    
    // Step 2: Test status updates (additional notifications)
    console.log('\n📋 Step 2: Testing status update notifications...');
    
    const statusUpdates = [
      { status: 'Arrived', description: 'Patient arrival at hospital' },
      { status: 'InTreatment', description: 'Treatment started' }
    ];
    
    for (const update of statusUpdates) {
      console.log(`\n🔄 Updating status to: ${update.status}`);
      
      const statusResponse = await makeRequest(
        `${BASE_URL}/api/reports/${reportId}/status`, 
        'PATCH', 
        {
          status: update.status,
          user_id: 'test_doctor',
          user_role: 'doctor'
        }
      );
      
      if (statusResponse.status === 200) {
        console.log(`✅ Status updated: ${update.description}`);
        console.log('📧📱 Additional notification should be sent');
      } else {
        console.log(`❌ Failed to update status: ${statusResponse.data.error}`);
      }
      
      // Wait between status updates
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Step 3: Check final report status
    console.log('\n📋 Step 3: Checking final report status...');
    const reportResponse = await makeRequest(`${BASE_URL}/api/reports/${reportId}`);
    
    if (reportResponse.status === 200) {
      const report = reportResponse.data.data;
      console.log(`✅ Final Status: ${report.status}`);
      console.log(`🏥 Hospital: ${report.hospital_name || 'Not assigned'}`);
      console.log(`👨‍⚕️ Doctor: ${report.assigned_doctor_name || 'Not assigned'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
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
      }
    }
  }
}

async function runTest() {
  console.log('🚨 MySpaceER Real-Time Notification Test');
  console.log('========================================\n');
  
  // Check server health
  console.log('🏥 Checking server health...');
  const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
  
  if (healthResponse.status !== 200) {
    console.error('❌ Server is not running. Please start the server first.');
    console.log('Run: cd server && node server-enhanced.js');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  // Check configuration
  await checkConfiguration();
  
  // Ask for confirmation
  console.log('🎯 About to test real-time notifications:');
  console.log(`   📧 Email will be sent to: ${testPatient.contact_email}`);
  console.log(`   📱 SMS will be sent to: ${testPatient.contact_phone}`);
  console.log('\n⚠️  Make sure you have configured your .env file with real credentials!');
  console.log('   See NOTIFICATION_SETUP.md for configuration instructions.\n');
  
  // Run the test
  await testNotificationSystem();
  
  console.log('\n🎉 Real-Time Notification Test Completed!');
  console.log('\n📋 Expected Results:');
  console.log('   1. 📧 Email notifications in your inbox');
  console.log('   2. 📱 SMS notifications on your phone');
  console.log('   3. 🖥️  Console logs showing notification attempts');
  console.log('\n💡 If notifications are not received:');
  console.log('   • Check your .env configuration');
  console.log('   • Verify Twilio/SMTP credentials');
  console.log('   • Check server console for error messages');
}

// Run the test
runTest().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});