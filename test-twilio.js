import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

console.log('🧪 Testing Twilio SMS Configuration...\n');

// Check if credentials are loaded
console.log('📋 Configuration Check:');
console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : '❌ Missing');
console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? `${process.env.TWILIO_AUTH_TOKEN.substring(0, 8)}...` : '❌ Missing');
console.log('From Phone:', process.env.TWILIO_PHONE_NUMBER || '❌ Missing');
console.log('');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('❌ Missing Twilio configuration. Check your .env file.');
    process.exit(1);
}

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

async function testTwilio() {
    try {
        console.log('🔍 Verifying Twilio account...');
        
        // First, validate the account
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Account Status:', account.status);
        console.log('✅ Account Type:', account.type);
        
        // Get phone number details
        console.log('\n📱 Checking phone number...');
        const phoneNumbers = await client.incomingPhoneNumbers.list();
        const myNumber = phoneNumbers.find(num => num.phoneNumber === process.env.TWILIO_PHONE_NUMBER);
        
        if (myNumber) {
            console.log('✅ Phone number verified:', myNumber.phoneNumber);
            console.log('   Capabilities:', {
                sms: myNumber.capabilities.sms,
                voice: myNumber.capabilities.voice
            });
        } else {
            console.log('⚠️  Phone number not found in account. Available numbers:');
            phoneNumbers.forEach(num => {
                console.log('   -', num.phoneNumber);
            });
        }
        
        // IMPORTANT: Replace this with YOUR actual phone number
        const testPhoneNumber = '+1876XXXXXXX'; // ← Put your real phone number here
        
        if (testPhoneNumber === '+1876XXXXXXX') {
            console.log('\n⚠️  Please edit this script and replace "+1876XXXXXXX" with your actual phone number');
            console.log('   Then run the test again.');
            return;
        }
        
        console.log(`\n📤 Sending test SMS to ${testPhoneNumber}...`);
        
        const message = await client.messages.create({
            body: `🧪 TEST: MySpaceER notification system is working! Time: ${new Date().toLocaleString()}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: testPhoneNumber
        });
        
        console.log('✅ SMS sent successfully!');
        console.log('   Message SID:', message.sid);
        console.log('   Status:', message.status);
        console.log('   To:', message.to);
        console.log('   From:', message.from);
        
        console.log('\n🎉 Twilio SMS is working correctly!');
        console.log('📱 Check your phone for the test message.');
        
    } catch (error) {
        console.error('\n❌ Twilio test failed:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        
        // Common error solutions
        if (error.code === 20003) {
            console.log('\n💡 Solution: This is a trial account. You need to verify the destination phone number in Twilio console first.');
            console.log('   Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        } else if (error.code === 21211) {
            console.log('\n💡 Solution: Invalid phone number format. Make sure to include country code (+1 for US/Canada).');
        } else if (error.code === 20404) {
            console.log('\n💡 Solution: Check your Twilio credentials (Account SID and Auth Token).');
        }
    }
}

// Run the test
testTwilio();