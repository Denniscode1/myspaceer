const twilio = require('twilio');
require('dotenv').config();

console.log('📱 Testing SMS to Your Verified Number...\n');

async function testSMS() {
    try {
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        console.log('📱 Sending test SMS to +18764740111...');
        
        const message = await client.messages.create({
            body: '🧪 TEST: MySpaceER SMS notifications are working! Your phone is verified and ready to receive emergency updates.',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: '+18764740111'
        });
        
        console.log('✅ SMS sent successfully!');
        console.log('   Message SID:', message.sid);
        console.log('   Status:', message.status);
        console.log('📱 CHECK YOUR PHONE for the test message!');
        
    } catch (error) {
        console.error('❌ SMS test failed:', error.message);
        console.error('Error Code:', error.code);
        
        if (error.code === 20003) {
            console.log('\n💡 Your phone number still needs to be verified in Twilio console');
            console.log('   Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
            console.log('   Add and verify: +18764740111');
        }
    }
}

testSMS();