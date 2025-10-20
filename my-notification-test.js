// Personal Notification Test - Update with YOUR contact information
import fetch from 'node-fetch';

console.log('🧪 Personal MySpaceER Notification Test');
console.log('=====================================\n');

// ✅ YOUR ACTUAL CONTACT INFORMATION
const MY_PHONE = '+18764740111';  // Your verified phone number
const MY_EMAIL = 'rhanaldidenniscode@gmail.com';  // Your email address

// Test patient report with YOUR contact information
const testPatient = {
  name: "Test Patient",
  gender: "male",
  age_range: "25-34",
  incident_type: "motor-vehicle-accident",
  incident_description: "Testing notification system with real contact info",
  patient_status: "conscious",
  transportation_mode: "ambulance",
  
  // Submitter contact (YOU will receive the notifications)
  submitter_name: "Test User",
  submitter_phone: MY_PHONE,
  submitter_email: MY_EMAIL,
  submitter_relationship: "Test Contact",
  
  latitude: 18.0179,
  longitude: -76.8099,
  location_address: "Kingston, Jamaica"
};

async function testPersonalNotifications() {
  // Validate contact information is provided
  if (MY_PHONE === '+1876XXXXXXX' || MY_EMAIL === 'your.email@gmail.com') {
    console.log('❌ Please update this script with your actual contact information!');
    console.log('');
    console.log('📝 Edit this file and replace:');
    console.log(`   MY_PHONE: "${MY_PHONE}" → Your actual phone number`);
    console.log(`   MY_EMAIL: "${MY_EMAIL}" → Your actual email address`);
    console.log('');
    console.log('📋 Steps:');
    console.log('1. Verify your phone in Twilio: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    console.log('2. Configure email settings in .env file');
    console.log('3. Update the contact info above');
    console.log('4. Run this script again');
    return;
  }
  
  console.log('📋 Test Configuration:');
  console.log('📱 SMS will be sent to:', MY_PHONE);
  console.log('📧 Email will be sent to:', MY_EMAIL);
  console.log('');
  
  try {
    console.log('🚀 Starting notification test...');
    console.log('📤 Submitting test patient report...');
    
    const response = await fetch('http://localhost:3001/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPatient)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Patient report submitted successfully!');
      console.log('📋 Report ID:', result.report_id);
      console.log('');
      console.log('🎉 Notifications should be sent to:');
      console.log('📱 SMS:', MY_PHONE);
      console.log('📧 Email:', MY_EMAIL);
      console.log('');
      console.log('📋 Expected notifications:');
      console.log('1. 📱 SMS: Queue position update');
      console.log('2. 📧 Email: Detailed queue information');
      console.log('3. 📱 SMS: Status changes (Processing → Assigned)');
      console.log('4. 📧 Email: Hospital assignment details');
      console.log('');
      console.log('⏰ Check your phone and email now!');
      console.log('');
      console.log('🔄 The system will continue processing automatically and send more updates');
      
    } else {
      console.error('❌ Patient submission failed:', result.error);
      
      if (result.missing_fields) {
        console.log('Missing fields:', result.missing_fields);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure the server is running:');
      console.log('   1. Open new terminal');
      console.log('   2. cd server');
      console.log('   3. node server-enhanced.js');
      console.log('   4. Then run this test again');
    }
  }
}

// Run the test
testPersonalNotifications();