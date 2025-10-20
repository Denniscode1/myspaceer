// Test patient submission with contact info to verify notifications
const fetch = require('node-fetch');

const testPatient = {
  name: "Test Patient",
  gender: "male", 
  age_range: "25-34",
  incident_type: "motor-vehicle-accident",
  incident_description: "Testing notification system",
  patient_status: "conscious",
  transportation_mode: "ambulance",
  
  // IMPORTANT: Replace with your actual contact info
  contact_phone: "+1876XXXXXXX", // Your verified phone number
  contact_email: "your.email@gmail.com", // Your actual email
  
  latitude: 18.0179,
  longitude: -76.8099,
  location_address: "Kingston, Jamaica"
};

async function testPatientSubmission() {
  try {
    console.log('📋 Submitting test patient with contact information...');
    
    const response = await fetch('http://localhost:3001/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPatient)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Patient submitted successfully!');
      console.log('Report ID:', result.report_id);
      console.log('');
      console.log('📱 Check your phone for SMS notifications!');
      console.log('📧 Check your email for detailed updates!');
      console.log('');
      console.log('The system should send you:');
      console.log('1. Queue position update SMS');
      console.log('2. Detailed queue email');
      console.log('3. Status updates as processing continues');
    } else {
      console.error('❌ Failed to submit patient:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Make sure the server is running:');
    console.log('   cd server && node server-enhanced.js');
  }
}

console.log('🧪 Testing Patient Notification System');
console.log('');
console.log('⚠️  IMPORTANT: Edit this file first!');
console.log('   Replace contact_phone and contact_email with your real info');
console.log('   Make sure your phone number is verified in Twilio console');
console.log('');

if (testPatient.contact_phone === '+1876XXXXXXX' || testPatient.contact_email === 'your.email@gmail.com') {
  console.log('❌ Please edit this file and replace the placeholder contact information');
  console.log('   - contact_phone: Your verified phone number');  
  console.log('   - contact_email: Your real email address');
  process.exit(1);
}

testPatientSubmission();