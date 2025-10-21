# MySpaceER Railway Deployment Guide

## Prerequisites
1. GitHub account
2. Railway account (sign up at https://railway.app)
3. All code committed to GitHub

## Step 1: Connect to Railway
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `myspaceer` repository

## Step 2: Configure Environment Variables
In Railway project dashboard, go to Variables tab and add:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-key-here
SESSION_SECRET=your-super-secure-session-secret-here

# Email Configuration (optional but recommended)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Twilio SMS (optional but recommended)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone

# Frontend URL (will be provided after frontend deployment)
FRONTEND_URL=https://denniscode1.github.io
```

## Step 3: Deploy Backend
1. Railway should automatically detect your app and start building
2. Wait for deployment to complete (~5-10 minutes)
3. Copy your Railway app URL (e.g., `https://your-app-name.up.railway.app`)

## Step 4: Update Frontend API URL
1. Update line 2 in `src/services/apiService.js` with your Railway URL:
   ```javascript
   ? 'https://your-app-name.up.railway.app/api'
   ```
2. Commit and push changes

## Step 5: Deploy Frontend to GitHub Pages
```bash
npm run build
npm run deploy
```

## Step 6: Update CORS
Add your GitHub Pages URL to Railway environment variables:
```
FRONTEND_URL=https://username.github.io/myspaceer
```

## Testing
1. Visit your GitHub Pages URL
2. Submit a test patient form
3. Check Railway logs for successful database operations

## Database Persistence
- Railway provides persistent storage automatically
- Database will survive deployments and restarts
- No additional configuration needed

## Troubleshooting
- Check Railway logs for errors
- Ensure all environment variables are set
- Verify CORS configuration includes your frontend URL