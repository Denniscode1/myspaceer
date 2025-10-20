const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Testing Gmail SMTP Configuration...\n');

async function testEmail() {
    try {
        const transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        console.log('🔍 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!');
        
        console.log('📤 Sending test email...');
        const info = await transporter.sendMail({
            from: {
                name: 'MySpaceER Emergency System',
                address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
            },
            to: process.env.EMAIL_USER,
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
                        <p><strong>📧 From Address:</strong> ${process.env.EMAIL_USER}</p>
                        <p><strong>📱 Phone Number:</strong> ${process.env.PHONE_NUMBER || 'Not configured'}</p>
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
        console.log(`📧 Check your inbox: ${process.env.EMAIL_USER}`);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
    }
}

testEmail();