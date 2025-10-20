// Test Submitter Notification System
// This script demonstrates how anyone who brings a patient to the hospital can receive notifications

import fetch from 'node-fetch';

console.log('🚨 MySpaceER Submitter Notification System Test');
console.log('==============================================\n');

// Test scenarios for different submitter types
const testScenarios = [
  {
    name: '👨‍⚕️ EMT Scenario',
    description: 'EMT brings patient to hospital and receives updates',
    patient: {
      name: "John Doe",
      gender: "male",
      age_range: "25-34",
      incident_type: "motor-vehicle-accident",
      incident_description: "Car accident, conscious patient",
      patient_status: "conscious", 
      transportation_mode: "ambulance",
      
      // Patient's own contact (may not be available)
      contact_phone: null,
      contact_email: null,
      
      // EMT (submitter) contact information
      submitter_name: "EMT Sarah Johnson",
      submitter_phone: "+1876XXXXXXX", // Your verified phone number
      submitter_email: "your.email@gmail.com", // Your email
      submitter_relationship: "EMT",
      
      latitude: 18.0179,
      longitude: -76.8099,
      location_address: "Kingston, Jamaica"
    }
  },
  {
    name: '👨‍👩‍👧‍👦 Family Member Scenario',
    description: 'Family member brings patient and wants updates',
    patient: {
      name: "Mary Johnson",
      gender: "female", 
      age_range: "65+",
      incident_type: "fall",
      incident_description: "Elderly fall at home, hip injury suspected",
      patient_status: "conscious",
      transportation_mode: "private_vehicle",
      
      // Patient's contact not available (elderly, confused)
      contact_phone: null,
      contact_email: null,
      
      // Family member (submitter) contact information
      submitter_name: "Robert Johnson",
      submitter_phone: "+1876XXXXXXX", // Your verified phone number
      submitter_email: "your.email@gmail.com", // Your email
      submitter_relationship: "Son",
      
      latitude: 18.0179,
      longitude: -76.8099,
      location_address: "Kingston, Jamaica"
    }
  },
  {
    name: '🚨 Emergency Contact Scenario',
    description: 'Good samaritan helps patient and provides their contact',
    patient: {
      name: "Unknown Patient",
      gender: "male",
      age_range: "35-44", 
      incident_type: "medical_emergency",
      incident_description: "Found unconscious on street",
      patient_status: "unconscious",
      transportation_mode: "ambulance",
      
      // Patient contact unknown
      contact_phone: null,
      contact_email: null,
      
      // Good samaritan (submitter) contact information  
      submitter_name: "Good Samaritan",
      submitter_phone: "+1876XXXXXXX", // Your verified phone number
      submitter_email: "your.email@gmail.com", // Your email
      submitter_relationship: "Witness",
      
      latitude: 18.0179,
      longitude: -76.8099,
      location_address: "Kingston, Jamaica"
    }
  }
];

async function testScenario(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 ${scenario.description}`);
  
  // Validate contact information is provided
  if (scenario.patient.submitter_phone === '+1876XXXXXXX' || scenario.patient.submitter_email === 'your.email@gmail.com') {
    console.log('❌ Please update the script with your actual contact information');
    console.log('   Replace +1876XXXXXXX with your verified phone number');
    console.log('   Replace your.email@gmail.com with your email address');
    return null;
  }
  
  try {
    console.log('📤 Submitting patient report...');
    
    const response = await fetch('http://localhost:3001/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scenario.patient)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Patient report submitted successfully!');
      console.log('📋 Report ID:', result.report_id);
      console.log('👤 Patient:', scenario.patient.name);
      console.log('📞 Submitter:', scenario.patient.submitter_name);
      console.log('📱 Phone:', scenario.patient.submitter_phone);
      console.log('📧 Email:', scenario.patient.submitter_email);
      console.log('👥 Relationship:', scenario.patient.submitter_relationship);
      
      console.log('\n🔔 Notifications will be sent to:');
      console.log(`   SMS: ${scenario.patient.submitter_phone}`);
      console.log(`   Email: ${scenario.patient.submitter_email}`);
      
      console.log('\n📱 Expected SMS notifications:');
      console.log('   • Queue position update');
      console.log('   • Status changes (Processing → Assigned → etc.)');
      console.log('   • Treatment ready alert');
      console.log('   • Treatment completion notice');
      
      console.log('\n📧 Expected Email notifications:');
      console.log('   • Detailed queue information with patient status');
      console.log('   • Hospital assignment details');
      console.log('   • Doctor assignment information');
      console.log('   • Treatment progress updates');
      console.log('   • Discharge instructions');
      
      return result.report_id;
      
    } else {
      console.error('❌ Patient submission failed:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && node server-enhanced.js');
    }
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting submitter notification tests...\n');
  
  // Check if contact information is configured
  const firstScenario = testScenarios[0];
  if (firstScenario.patient.submitter_phone === '+1876XXXXXXX' || firstScenario.patient.submitter_email === 'your.email@gmail.com') {
    console.log('⚠️  Configuration Required!');
    console.log('');
    console.log('Before running this test, please:');
    console.log('1. Edit this script and replace:');
    console.log('   - "+1876XXXXXXX" with your verified phone number');
    console.log('   - "your.email@gmail.com" with your email address');
    console.log('');
    console.log('2. Make sure your phone number is verified in Twilio:');
    console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    console.log('');
    console.log('3. Make sure your email is configured in .env file');
    console.log('');
    console.log('4. Start the server: node server/server-enhanced.js');
    return;
  }
  
  const reportIds = [];
  
  for (const scenario of testScenarios) {
    const reportId = await testScenario(scenario);
    if (reportId) {
      reportIds.push(reportId);
    }
    
    // Wait between tests
    if (scenario !== testScenarios[testScenarios.length - 1]) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n🎉 Submitter notification tests completed!');
  console.log(`📋 Created ${reportIds.length} test reports`);
  
  if (reportIds.length > 0) {
    console.log('\n📱 Check your phone for SMS notifications!');
    console.log('📧 Check your email for detailed updates!');
    console.log('');
    console.log('You should receive notifications for:');
    reportIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${testScenarios[index].patient.name} (${id})`);
    });
  }
  
  console.log('\n💡 Benefits of Submitter Notifications:');
  console.log('   ✅ EMTs stay informed about patient progress');
  console.log('   ✅ Family members receive updates even if patient can\\'t');
  console.log('   ✅ Emergency contacts know when their help was successful');
  console.log('   ✅ Anyone who brings someone to hospital gets closure');
}

// Run the tests
runAllTests();