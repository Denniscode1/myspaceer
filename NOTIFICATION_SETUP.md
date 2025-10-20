# 🚨 MySpaceER Real-Time Notifications Setup Guide

This guide will help you configure real SMS and email notifications for your emergency triage system.

## 📋 Prerequisites

✅ **Completed**: Required packages installed (twilio, nodemailer, dotenv)
✅ **Completed**: Environment configuration file created (.env)
✅ **Completed**: Notification service updated with real providers

## 🔧 Configuration Steps

### 1. Twilio SMS Setup (Required for SMS notifications)

1. **Sign up for Twilio**: Go to https://www.twilio.com/
2. **Create account**: Use your phone number and email
3. **Get credentials**: From your Twilio Console Dashboard:
   - Account SID (starts with AC...)
   - Auth Token (32-character string)
4. **Get phone number**: 
   - Trial accounts get a free number
   - Production accounts need to purchase a number
5. **Update .env file**:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### 2. Email SMTP Setup (Required for email notifications)

#### Option A: Gmail (Recommended for testing)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to https://support.google.com/accounts/answer/185833
   - Generate 16-character app password
3. **Update .env file**:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   EMAIL_FROM_NAME=MySpaceER Emergency System
   EMAIL_FROM_ADDRESS=your.email@gmail.com
   ```

#### Option B: Outlook/Hotmail
1. **Update .env file**:
   ```
   EMAIL_HOST=smtp-mail.outlook.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your.email@outlook.com
   EMAIL_PASS=your_password_here
   ```

## 🎛️ Notification Settings

Edit your `.env` file to control notification behavior:

```bash
# Enable real providers
SMS_PROVIDER=twilio       # Options: console, twilio, disabled
EMAIL_PROVIDER=smtp       # Options: console, smtp, disabled

# Testing options
TEST_MODE=false           # Set to true to simulate without sending
ENABLE_CONSOLE_LOGGING=true  # Show notifications in console too
```

## 🚀 Testing Your Configuration

### Quick Test (Console only)
```bash
# Set to console mode first to verify system works
SMS_PROVIDER=console
EMAIL_PROVIDER=console
```

### Real Provider Test
```bash
# Enable real providers
SMS_PROVIDER=twilio
EMAIL_PROVIDER=smtp
TEST_MODE=false
```

## 📋 Testing Checklist

1. **✅ Server starts without errors**
   - Look for "✅ Twilio SMS configured successfully"
   - Look for "✅ SMTP Email configured successfully"
   - Look for "✅ Email server connection verified"

2. **✅ Submit patient form**
   - Enter your real email and phone number
   - Check server console for notifications

3. **✅ Receive actual notifications**
   - SMS to your phone
   - Email to your inbox

## 🔧 Troubleshooting

### Common Issues

**Twilio SMS not working:**
- ❌ Invalid credentials → Check Account SID and Auth Token
- ❌ Invalid phone number → Must include country code (+1 for US)
- ❌ Trial limitations → Verify phone numbers in Twilio console

**Email not working:**
- ❌ Gmail authentication → Use app password, not regular password
- ❌ Connection refused → Check EMAIL_HOST and EMAIL_PORT
- ❌ SSL/TLS issues → Try EMAIL_SECURE=true for port 465

### Debug Mode
Enable detailed logging:
```bash
ENABLE_CONSOLE_LOGGING=true
```

### Test Mode
Test without sending real notifications:
```bash
TEST_MODE=true
```

## 🚨 Security Notes

1. **Never commit .env file** to version control
2. **Keep credentials secure** - treat like passwords
3. **Use app passwords** for Gmail (not your regular password)
4. **Monitor usage** - Twilio and SMS providers charge per message

## 📊 Expected Notifications

When configured correctly, patients will receive:

### 📱 SMS Notifications
- Queue position updates
- Status changes (Arrived, InTreatment, etc.)
- Treatment ready alerts
- Completion notifications

### 📧 Email Notifications
- Detailed medical updates
- Hospital assignment info
- Doctor assignment
- Treatment summaries
- Discharge instructions

## 🎯 Next Steps

1. **Configure your .env file** with real credentials
2. **Test in console mode** first
3. **Enable real providers** when ready
4. **Submit patient form** with your contact info
5. **Check your phone and email** for notifications!

## 🆘 Getting Help

If you encounter issues:
1. Check the server console for error messages
2. Verify your .env configuration
3. Test with console mode first
4. Check Twilio/email provider documentation

---

**🎉 Once configured, your MySpaceER system will send real-time SMS and email notifications to patients throughout their emergency care journey!**