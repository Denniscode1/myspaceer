# Email Notifications Setup Guide

## Current Status
❌ Email notifications are currently in **console mode** - they only log to console, not actually send.

## To Enable Real Email Notifications

### Option 1: Gmail SMTP (Recommended for Testing)

1. **Get a Gmail App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Create an app password for "Mail"
   - Copy the 16-character password

2. **Set Heroku Config:**
```bash
heroku config:set EMAIL_PROVIDER=smtp
heroku config:set EMAIL_HOST=smtp.gmail.com
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_SECURE=false
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password-here
heroku config:set EMAIL_FROM_NAME="MySpaceER Emergency System"
heroku config:set EMAIL_FROM_ADDRESS=your-email@gmail.com
```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up for SendGrid:**
   - Go to https://sendgrid.com/
   - Get a free account (100 emails/day)
   - Create an API key

2. **Set Heroku Config:**
```bash
heroku config:set EMAIL_PROVIDER=smtp
heroku config:set EMAIL_HOST=smtp.sendgrid.net
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_SECURE=false
heroku config:set EMAIL_USER=apikey
heroku config:set EMAIL_PASS=your-sendgrid-api-key
heroku config:set EMAIL_FROM_NAME="MySpaceER Emergency System"
heroku config:set EMAIL_FROM_ADDRESS=verified@yourdomain.com
```

### Option 3: Mailgun

1. **Sign up for Mailgun:**
   - Go to https://mailgun.com
   - Verify your domain or use their sandbox

2. **Set Heroku Config:**
```bash
heroku config:set EMAIL_PROVIDER=smtp
heroku config:set EMAIL_HOST=smtp.mailgun.org
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_SECURE=false
heroku config:set EMAIL_USER=your-mailgun-username
heroku config:set EMAIL_PASS=your-mailgun-password
heroku config:set EMAIL_FROM_NAME="MySpaceER Emergency System"
heroku config:set EMAIL_FROM_ADDRESS=mailgun@yourdomain.com
```

## Testing Email Locally

Create a `.env` file in the `server` folder:

```bash
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=MySpaceER Emergency System
EMAIL_FROM_ADDRESS=your-email@gmail.com
```

## Current Email Types

The system sends these types of emails:

1. **Queue Position Updates** - When patient's queue position changes
2. **Treatment Ready** - When patient is next for treatment
3. **Status Updates** - When report status changes
4. **Medical Staff Credentials** - When staff request access
5. **Arrival Reminders** - When patient is arriving at hospital

## Troubleshooting

### Emails Not Sending

1. **Check Heroku Logs:**
```bash
heroku logs --tail | findstr "Email"
```

2. **Verify Config:**
```bash
heroku config | findstr "EMAIL"
```

3. **Check Provider Status:**
   - Gmail: Ensure "Less secure app access" is OFF and using App Password
   - SendGrid: Check API key validity
   - Mailgun: Verify domain or use sandbox

### Gmail Specific Issues

- **"Username and Password not accepted"**: Use App Password, not regular password
- **"Authentication failed"**: Enable 2FA first, then create App Password
- **"Blocked sign-in attempt"**: Allow less secure apps or use App Password

## Quick Setup Command (Gmail Example)

Replace with your credentials:

```bash
heroku config:set EMAIL_PROVIDER=smtp EMAIL_HOST=smtp.gmail.com EMAIL_PORT=587 EMAIL_SECURE=false EMAIL_USER=youremail@gmail.com EMAIL_PASS=your-app-password EMAIL_FROM_NAME="MySpaceER Emergency" EMAIL_FROM_ADDRESS=youremail@gmail.com
```

Then restart:
```bash
heroku restart
```

## Verify Setup

After configuring, test by:
1. Creating a patient report
2. Requesting medical staff access
3. Check the recipient's inbox

The system will log email sending status in the Heroku logs.

---

**Need Help?** 
- Check logs: `heroku logs --tail`
- Test locally first with your .env file
- Verify SMTP credentials work with an email client first
