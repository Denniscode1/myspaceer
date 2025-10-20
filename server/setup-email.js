import fs from 'fs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load current .env
dotenv.config();

console.log('📧 MySpaceER Email Configuration Setup');
console.log('=====================================\n');

// Function to update .env file
function updateEnvFile(email, appPassword) {
    console.log('📝 Updating .env file with email configuration...');
    
    let envContent = fs.readFileSync('.env', 'utf8');
    
    // Update email provider to use SMTP instead of console
    envContent = envContent.replace(/EMAIL_PROVIDER=console/, 'EMAIL_PROVIDER=smtp');
    
    // Update email credentials
    envContent = envContent.replace(/EMAIL_USER=your\.email@gmail\.com/, `EMAIL_USER=${email}`);
    envContent = envContent.replace(/EMAIL_PASS=your_app_password_here/, `EMAIL_PASS=${appPassword}`);
    envContent = envContent.replace(/EMAIL_FROM_ADDRESS=your\.email@gmail\.com/, `EMAIL_FROM_ADDRESS=${email}`);
    
    // Write back to file
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file updated successfully!\n');
}

// Function to test email configuration
async function testEmail(email, appPassword) {
    console.log('🧪 Testing email configuration...');
    
    try {
        const transporter = nodemailer.createTransporter({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: email,
                pass: appPassword
            }
        });
        
        // Verify connection
        console.log('🔍 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!');
        
        // Send test email
        console.log('📤 Sending test email...');
        const info = await transporter.sendMail({
            from: {
                name: 'MySpaceER Emergency System',
                address: email
            },
            to: email,
            subject: '🧪 TEST: MySpaceER Email Notifications Working!',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0; text-align: center;">🏥 MySpaceER Emergency System</h2>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
                        <h3>🎉 Email Notifications Successfully Configured!</h3>
                        <p>This is a test email to confirm your MySpaceER emergency notification system is working correctly.</p>
                        <p><strong>✅ Email Provider:</strong> Gmail SMTP</p>
                        <p><strong>📧 From Address:</strong> ${email}</p>
                        <p><strong>🕐 Test Time:</strong> ${new Date().toLocaleString()}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666; text-align: center;">
                            Your emergency notification system is now ready to send real-time updates!
                        </p>
                    </div>
                </div>
            `
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('   Message ID:', info.messageId);
        console.log('📧 Check your inbox for the test email!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 Authentication failed. Please check:');
            console.log('   1. Email address is correct');
            console.log('   2. App password is correct (16 characters, no spaces)');
            console.log('   3. 2-Factor Authentication is enabled on your Gmail');
        } else if (error.code === 'ENOTFOUND') {
            console.log('\n💡 Network connection issue. Check your internet connection.');
        }
        
        return false;
    }
}

// Main setup function
async function setupEmail() {
    console.log('📋 Please provide your email configuration:\n');
    
    // In a real interactive script, you'd use readline here
    // For now, we'll use placeholder values that user needs to replace
    
    const email = 'YOUR_EMAIL@gmail.com';
    const appPassword = 'YOUR_16_CHAR_APP_PASSWORD';
    
    if (email === 'YOUR_EMAIL@gmail.com' || appPassword === 'YOUR_16_CHAR_APP_PASSWORD') {
        console.log('❌ Please edit this script first!');
        console.log('');
        console.log('1. Replace "YOUR_EMAIL@gmail.com" with your actual Gmail address');
        console.log('2. Replace "YOUR_16_CHAR_APP_PASSWORD" with your Gmail app password');
        console.log('3. Run this script again');
        console.log('');
        console.log('📝 To get your Gmail app password:');
        console.log('   - Go to: https://myaccount.google.com/apppasswords');
        console.log('   - Create an app password for "Mail"');
        console.log('   - Copy the 16-character password (like: abcd efgh ijkl mnop)');
        return;
    }
    
    // Update .env file
    updateEnvFile(email, appPassword);
    
    // Test email configuration
    const success = await testEmail(email, appPassword);
    
    if (success) {
        console.log('\n🎉 Email configuration completed successfully!');
        console.log('📧 You will now receive both SMS and Email notifications!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Make sure your Twilio phone number is verified');
        console.log('2. Test the complete notification system');
    } else {
        console.log('\n❌ Email configuration failed. Please check the setup and try again.');
    }
}

setupEmail();