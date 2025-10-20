// Complete MySpaceER Notification System Setup and Test
import fs from 'fs';
import fetch from 'node-fetch';

// =============================================
// STEP 1: CONFIGURE YOUR CONTACT INFORMATION
// =============================================

// 📱 Your verified phone number (verify in Twilio console first!)
const YOUR_PHONE = '+1876XXXXXXX';

// 📧 Your Gmail information
const YOUR_EMAIL = 'your.email@gmail.com';
const YOUR_GMAIL_APP_PASSWORD = 'YOUR_16_CHAR_APP_PASSWORD';

// =============================================
// STEP 2: UPDATE .ENV FILE WITH EMAIL CONFIG
// =============================================

function updateEmailConfig() {
    console.log('📝 Updating .env file with email configuration...');
    
    try {
        let envContent = fs.readFileSync('./server/.env', 'utf8');
        
        // Update email provider to use SMTP
        envContent = envContent.replace(/EMAIL_PROVIDER=console/, 'EMAIL_PROVIDER=smtp');
        
        // Update email credentials
        envContent = envContent.replace(/EMAIL_USER=your\.email@gmail\.com/, `EMAIL_USER=${YOUR_EMAIL}`);
        envContent = envContent.replace(/EMAIL_PASS=your_app_password_here/, `EMAIL_PASS=${YOUR_GMAIL_APP_PASSWORD}`);
        envContent = envContent.replace(/EMAIL_FROM_ADDRESS=your\.email@gmail\.com/, `EMAIL_FROM_ADDRESS=${YOUR_EMAIL}`);
        
        fs.writeFileSync('./server/.env', envContent);
        console.log('✅ .env file updated with email configuration!\n');
        
    } catch (error) {
        console.error('❌ Failed to update .env file:', error.message);
    }
}

// =============================================
// STEP 3: UPDATE TWILIO TEST SCRIPT
// =============================================

function updateTwilioTest() {
    console.log('📱 Updating Twilio test script with your phone number...');
    
    try {
        let testContent = fs.readFileSync('./server/test-twilio-simple.js', 'utf8');
        
        // Replace placeholder phone number with actual number
        testContent = testContent.replace(
            /const testNumber = '\+1876XXXXXXX';/,
            `const testNumber = '${YOUR_PHONE}';`
        );
        
        fs.writeFileSync('./server/test-twilio-simple.js', testContent);
        console.log('✅ Twilio test script updated!\n');
        
    } catch (error) {
        console.error('❌ Failed to update Twilio test script:', error.message);
    }
}

// =============================================
// STEP 4: CREATE PATIENT TEST WITH YOUR INFO
// =============================================

function createPatientTest() {
    console.log('👤 Creating patient test with your contact information...');
    
    const testPatientData = {
        name: "Test Patient",
        gender: "male",
        age_range: "25-34", 
        incident_type: "motor-vehicle-accident",
        incident_description: "Testing MySpaceER notification system",
        patient_status: "conscious",
        transportation_mode: "ambulance",
        
        // Your actual contact information
        contact_phone: YOUR_PHONE,
        contact_email: YOUR_EMAIL,
        
        latitude: 18.0179,
        longitude: -76.8099,
        location_address: "Kingston, Jamaica"
    };
    
    fs.writeFileSync('./patient-test-data.json', JSON.stringify(testPatientData, null, 2));
    console.log('✅ Patient test data created!\n');
    
    return testPatientData;
}

// =============================================
// STEP 5: TEST PATIENT SUBMISSION
// =============================================

async function testPatientSubmission(patientData) {
    console.log('🧪 Testing patient submission with notifications...');
    
    try {
        const response = await fetch('http://localhost:3001/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Patient submitted successfully!');
            console.log('📋 Report ID:', result.report_id);
            console.log('');
            console.log('🎉 You should now receive:');
            console.log('📱 SMS: Queue position update');
            console.log('📧 Email: Detailed queue and status information');
            console.log('');
            console.log('Check your phone and email for notifications!');
            
            return result.report_id;
        } else {
            console.error('❌ Patient submission failed:', result.error);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('💡 Make sure the server is running: node server/server-enhanced.js');
        return null;
    }
}

// =============================================
// MAIN SETUP FUNCTION
// =============================================

async function completeSetup() {
    console.log('🚨 MySpaceER Complete Notification System Setup');
    console.log('================================================\n');
    
    // Validate user has provided their information
    if (YOUR_PHONE === '+1876XXXXXXX' || YOUR_EMAIL === 'your.email@gmail.com' || YOUR_GMAIL_APP_PASSWORD === 'YOUR_16_CHAR_APP_PASSWORD') {
        console.log('❌ Please edit this script first!\n');
        console.log('📝 Replace the following in this script:');
        console.log(`   YOUR_PHONE: '${YOUR_PHONE}' → Your actual phone number`);
        console.log(`   YOUR_EMAIL: '${YOUR_EMAIL}' → Your Gmail address`);
        console.log(`   YOUR_GMAIL_APP_PASSWORD: '${YOUR_GMAIL_APP_PASSWORD}' → Your 16-char app password`);
        console.log('');
        console.log('📋 Steps to get Gmail app password:');
        console.log('   1. Go to: https://myaccount.google.com/apppasswords');
        console.log('   2. Create app password for "Mail"');  
        console.log('   3. Copy the 16-character password');
        console.log('');
        console.log('📱 Make sure your phone number is verified in Twilio:');
        console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        return;
    }
    
    console.log('📋 Configuration Summary:');
    console.log('📱 Phone:', YOUR_PHONE);
    console.log('📧 Email:', YOUR_EMAIL);
    console.log('🔐 App Password: ✅ Provided');
    console.log('');
    
    // Step 1: Update email configuration
    updateEmailConfig();
    
    // Step 2: Update Twilio test
    updateTwilioTest();
    
    // Step 3: Create patient test data
    const patientData = createPatientTest();
    
    // Step 4: Test patient submission
    console.log('🚀 Ready to test notifications!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Make sure your server is running: node server/server-enhanced.js');
    console.log('2. Run this script again to test patient submission');
    console.log('3. Check your phone and email for notifications!');
    
    // Uncomment the line below to automatically test patient submission
    // const reportId = await testPatientSubmission(patientData);
}

// Run the setup
completeSetup();