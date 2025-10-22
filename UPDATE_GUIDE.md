# Quick Update Guide - MySpaceER on Heroku

## Your Deployed App
🌐 **Live URL:** https://myspaceer-app-203b58d5efad.herokuapp.com/
📊 **Dashboard:** https://dashboard.heroku.com/apps/myspaceer-app

---

## Update Your Live App (3 Simple Steps)

Whenever you make changes to your code:

```powershell
# 1. Stage your changes
git add .

# 2. Commit with a message
git commit -m "Describe your changes here"

# 3. Deploy to Heroku
git push heroku main
```

That's it! Your app will rebuild and update automatically (takes ~2 minutes).

---

## Useful Commands

### Check if app is running
```powershell
heroku ps
```

### View live logs
```powershell
heroku logs --tail
```

### Restart the app
```powershell
heroku restart
```

### Open app in browser
```powershell
heroku open
```

### Check environment variables
```powershell
heroku config
```

### Add environment variable
```powershell
heroku config:set VARIABLE_NAME=value
```

---

## Set Up Automatic Deployment from GitHub

Want updates to go live automatically when you push to GitHub?

1. Go to: https://dashboard.heroku.com/apps/myspaceer-app/deploy
2. Click **"Connect to GitHub"**
3. Search for your repository and connect it
4. Enable **"Automatic Deploys"** from main branch
5. Now `git push` to GitHub will automatically deploy!

---

## Important Notes

⚠️ **Database:** Your app uses SQLite, which resets when Heroku restarts. For production, consider switching to PostgreSQL:
```powershell
heroku addons:create heroku-postgresql:mini
```

💤 **Free Tier:** App sleeps after 30 mins of inactivity. First request will take ~10 seconds to wake up.

⚡ **Keep Always Running:** Upgrade to Hobby dyno ($7/month):
```powershell
heroku ps:type hobby
```

---

## Testing Your Endpoints

### Health Check
```powershell
curl https://myspaceer-app-203b58d5efad.herokuapp.com/api/health
```

### View All Reports
```powershell
curl https://myspaceer-app-203b58d5efad.herokuapp.com/api/reports
```

### Submit Test Report
```powershell
curl -X POST https://myspaceer-app-203b58d5efad.herokuapp.com/api/reports `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Test Patient",
    "gender": "male",
    "age_range": "18-30",
    "incident_type": "injury",
    "patient_status": "conscious",
    "transportation_mode": "ambulance"
  }'
```

---

## Troubleshooting

### App crashed?
```powershell
heroku logs --tail
heroku restart
```

### Build failed?
Check that package-lock.json is up to date:
```powershell
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push heroku main
```

### Need to rollback?
```powershell
heroku releases
heroku rollback v6  # replace v6 with version number
```

---

## Support

- Heroku Dashboard: https://dashboard.heroku.com/apps/myspaceer-app
- Heroku Docs: https://devcenter.heroku.com/
- View logs: `heroku logs --tail`
