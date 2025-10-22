# Heroku Deployment Guide for MySpaceER

## Prerequisites
✅ Heroku CLI installed (already done)
- Node.js 18+ 
- Git installed

## Important Database Note
⚠️ **SQLite won't persist on Heroku** (uses ephemeral filesystem). You have two options:

### Option A: Use PostgreSQL (Recommended for production)
Requires code changes to switch from SQLite to PostgreSQL.

### Option B: Keep SQLite (Quick deployment, data resets on restart)
Good for testing/demo purposes only.

---

## Deployment Steps

### 1. Login to Heroku
```powershell
heroku login
```
This will open your browser to authenticate.

### 2. Initialize Git (if not already done)
```powershell
git init
git add .
git commit -m "Initial commit for Heroku deployment"
```

### 3. Create Heroku App
```powershell
heroku create myspaceer-app
```
Or with a custom name:
```powershell
heroku create your-custom-app-name
```

### 4. Set Environment Variables
```powershell
# Set Node environment to production
heroku config:set NODE_ENV=production

# Add your frontend URL (will be your Heroku app URL)
heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com

# If you have API keys or other secrets, add them:
# heroku config:set API_KEY={{YOUR_API_KEY}}
# heroku config:set TWILIO_ACCOUNT_SID={{YOUR_TWILIO_SID}}
# heroku config:set TWILIO_AUTH_TOKEN={{YOUR_TWILIO_TOKEN}}
```

### 5. Deploy to Heroku
```powershell
git push heroku main
```
Or if your branch is named differently:
```powershell
git push heroku master
```

### 6. Scale the Web Dyno
```powershell
heroku ps:scale web=1
```

### 7. Open Your App
```powershell
heroku open
```

---

## Update Your Live App (After Initial Deployment)

Whenever you make changes and want to update the live app:

```powershell
# 1. Commit your changes
git add .
git commit -m "Your update message"

# 2. Push to Heroku
git push heroku main

# 3. Check logs if needed
heroku logs --tail
```

---

## Useful Heroku Commands

### View logs
```powershell
heroku logs --tail
```

### Check app status
```powershell
heroku ps
```

### Restart the app
```powershell
heroku restart
```

### View environment variables
```powershell
heroku config
```

### Open app in browser
```powershell
heroku open
```

---

## Setting Up Continuous Deployment (GitHub Integration)

For automatic updates when you push to GitHub:

1. Go to your Heroku Dashboard: https://dashboard.heroku.com
2. Select your app
3. Go to the "Deploy" tab
4. Under "Deployment method", select **GitHub**
5. Connect your GitHub account
6. Search for your repository and connect it
7. Enable **Automatic Deploys** from your main/master branch
8. Now every push to GitHub will automatically deploy to Heroku!

---

## Database Options

### Option A: Switch to PostgreSQL (Recommended)

1. Add PostgreSQL addon:
```powershell
heroku addons:create heroku-postgresql:mini
```

2. Install PostgreSQL client in your project:
```powershell
npm install pg
cd server && npm install pg
```

3. Update your database code to use PostgreSQL instead of SQLite
   - You'll need to modify `server/database-enhanced.js` to connect to PostgreSQL
   - Use `process.env.DATABASE_URL` (automatically set by Heroku)

### Option B: Keep SQLite (Testing Only)
The current setup will work but:
- ⚠️ Data will be lost when the dyno restarts
- ⚠️ Not suitable for production
- ✅ Good for quick demos/testing

---

## Troubleshooting

### Build fails
```powershell
# Check build logs
heroku logs --tail
```

### App crashes
```powershell
# View error logs
heroku logs --tail

# Check dyno status
heroku ps
```

### Port issues
Make sure your server uses `process.env.PORT` (already configured in server.js)

### Database issues
If using SQLite, remember data is temporary on Heroku's ephemeral filesystem.

---

## Cost
- Free tier available (with limitations)
- App sleeps after 30 mins of inactivity
- To keep app always running, upgrade to Hobby dyno ($7/month)

```powershell
heroku ps:type hobby
```

---

## Next Steps After Deployment

1. Test all endpoints: `https://your-app-name.herokuapp.com/api/health`
2. Set up GitHub continuous deployment (see above)
3. Consider upgrading to PostgreSQL for data persistence
4. Monitor app performance in Heroku Dashboard
5. Set up custom domain (optional)

## Support
- Heroku Docs: https://devcenter.heroku.com/
- Check logs: `heroku logs --tail`
