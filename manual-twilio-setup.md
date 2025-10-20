# Manual Twilio Setup Guide

If you're having trouble with the automated script, you can set up Twilio manually:

## Step 1: Find Your Credentials

Go to https://console.twilio.com/ and find these 4 values:

1. **Account SID** (starts with AC...)
   - Location: Top right "Account Info" box
   - Format: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

2. **Auth Token** (32 characters)
   - Location: Same "Account Info" box, click eye icon to reveal
   - Format: 1234567890abcdef1234567890abcdef

3. **Twilio Phone Number** (your SMS sending number)
   - Location: Phone Numbers > Manage > Active numbers
   - Format: +15551234567

4. **Your Phone Number** (where you'll receive SMS)
   - This is YOUR phone number that you verified during signup
   - Format: +1876xxxxxxx (or your country code)

## Step 2: Edit .env File Manually

Open `server\.env` file and update these lines:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

## Step 3: Update Test Script

Open `test-your-phone.ps1` and update line 8:
```powershell
$yourPhone = "+1876xxxxxxx"  # Your actual phone number
```

## Step 4: Restart and Test

1. Stop current server:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```

2. Start server with Twilio:
   ```powershell
   Start-Process -FilePath "node" -ArgumentList "server\server-enhanced.js" -WorkingDirectory "." -WindowStyle Hidden
   ```

3. Run test:
   ```powershell
   PowerShell -ExecutionPolicy Bypass -File .\test-your-phone.ps1
   ```

You should receive real SMS messages on your phone!