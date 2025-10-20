const twilio = require('twilio');
require('dotenv').config();

console.log('🔍 Twilio Account Diagnostic...\n');

async function diagnoseTwilio() {
    try {
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        console.log('📋 Account Information:');
        console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
        console.log('Twilio Phone:', process.env.TWILIO_PHONE_NUMBER);
        console.log('');
        
        // Try to get account info
        console.log('🔍 Checking account status...');
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Account Status:', account.status);
        console.log('✅ Account Type:', account.type);
        console.log('');
        
        // Try to get verified phone numbers
        console.log('📱 Checking verified phone numbers...');
        const validationRequests = await client.validationRequests.list();
        console.log(`Found ${validationRequests.length} validation requests`);
        
        if (validationRequests.length > 0) {
            validationRequests.forEach((request, index) => {
                console.log(`${index + 1}. Phone: ${request.phoneNumber}, Status: ${request.validationCode ? 'Validated' : 'Pending'}`);
            });
        } else {
            console.log('⚠️  No verified phone numbers found');
        }
        
        console.log('');
        
        // Try to get phone numbers (for non-trial accounts)
        try {
            console.log('📞 Checking phone numbers...');
            const phoneNumbers = await client.incomingPhoneNumbers.list();
            console.log(`Found ${phoneNumbers.length} phone number(s)`);
            phoneNumbers.forEach(num => {
                console.log(`   - ${num.phoneNumber} (SMS: ${num.capabilities.sms ? '✅' : '❌'})`);
            });
        } catch (phoneError) {
            console.log('⚠️  Could not list phone numbers (normal for trial accounts)');
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        console.error('Error Code:', error.code);
        
        if (error.code === 20003) {
            console.log('\n📝 Troubleshooting Steps:');
            console.log('1. Make sure you\'re logged into the correct Twilio account');
            console.log('2. Verify your Account SID and Auth Token are correct');
            console.log('3. Add +18764740111 to verified caller IDs');
            console.log('4. Complete the verification by entering the SMS code');
            console.log('');
            console.log('🔗 Direct link: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        }
    }
}

diagnoseTwilio();