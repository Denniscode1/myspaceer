import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 Testing Twilio SMS Configuration...\n');

// Check credentials
console.log('📋 Configuration Check:');
console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : '❌ Missing');
console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Found' : '❌ Missing');
console.log('From Phone:', process.env.TWILIO_PHONE_NUMBER || '❌ Missing');
console.log('');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('❌ Missing Twilio configuration. Check your .env file.');
    process.exit(1);
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function testTwilio() {
    try {
        console.log('🔍 Verifying Twilio account...');
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Account Status:', account.status);
        console.log('✅ Account Type:', account.type);
        
        console.log('\n📱 Checking phone numbers...');
        const phoneNumbers = await client.incomingPhoneNumbers.list();
        console.log(`Found ${phoneNumbers.length} phone number(s):`);
        phoneNumbers.forEach(num => {
            console.log(`   - ${num.phoneNumber} (SMS: ${num.capabilities.sms ? '✅' : '❌'})`);
        });
        
        // For Twilio trial accounts, you need to verify destination numbers first
        console.log('\n⚠️  IMPORTANT for Trial Accounts:');
        console.log('   1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        console.log('   2. Add and verify your phone number');
        console.log('   3. Then edit this script to test with your verified number');
        
        // YOUR VERIFIED PHONE NUMBER
        const testNumber = '+18764740111'; // Your actual phone number
        
        if (testNumber === '+1876XXXXXXX') {
            console.log('\n📝 To test SMS sending:');
            console.log('   1. Replace "+1876XXXXXXX" with your verified phone number in this script');
            console.log('   2. Run the script again');
            return;
        }
        
        console.log(`\n📤 Sending test SMS to ${testNumber}...`);
        const message = await client.messages.create({
            body: '🧪 TEST: MySpaceER SMS notifications are working!',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: testNumber
        });
        
        console.log('✅ SMS sent successfully!');
        console.log('   Message SID:', message.sid);
        console.log('📱 Check your phone for the test message!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Error Code:', error.code);
        
        if (error.code === 20003) {
            console.log('\n💡 Solution: Your phone number needs to be verified in Twilio console');
            console.log('   Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        } else if (error.code === 21211) {
            console.log('\n💡 Solution: Invalid phone number format. Use +1876XXXXXXX format');
        }
    }
}

testTwilio();