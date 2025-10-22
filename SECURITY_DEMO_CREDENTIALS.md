# Demo Credentials Security

## Overview
Demo credentials are **automatically hidden in production** and only visible to developers in development mode.

## How It Works

### Development Mode (Demo Credentials Visible)
Demo credentials are shown when:
- Running locally with `npm run dev` (Vite development server)
- `VITE_SHOW_DEMO_CREDENTIALS=true` is set in environment variables

### Production Mode (Demo Credentials Hidden)
Demo credentials are hidden when:
- Deployed to production (Heroku, Netlify, etc.)
- Built with `npm run build` without the flag
- `VITE_SHOW_DEMO_CREDENTIALS` is `false` or not set

## Demo Credentials (Development Only)

These credentials work **only in development mode**:

| Role   | Username | Password          |
|--------|----------|-------------------|
| Admin  | admin    | MySpaceER2024!    |
| Doctor | doctor   | doctor123         |
| Nurse  | nurse    | nurse123          |

## Configuration

### For Development (Show Demo Credentials)
```bash
# In your .env file
VITE_SHOW_DEMO_CREDENTIALS=true
```

### For Production (Hide Demo Credentials)
```bash
# In your .env file or Heroku config vars
VITE_SHOW_DEMO_CREDENTIALS=false
# OR simply remove/comment out the variable
```

### Heroku Configuration
To ensure demo credentials are hidden on Heroku:

```bash
# Do NOT set this variable in production
# If it exists, remove it:
heroku config:unset VITE_SHOW_DEMO_CREDENTIALS

# Or explicitly set it to false:
heroku config:set VITE_SHOW_DEMO_CREDENTIALS=false
```

## What Changes in Production

### Login Screen
- ❌ No "Demo Credentials for Testing" section
- ❌ No hardcoded test usernames/passwords visible
- ✅ Only "Request Medical Staff Access" button shown
- ✅ Generic error messages (no credential hints)

### Error Messages
**Development:**
- "Invalid credentials. Try demo: admin/MySpaceER2024!, doctor/doctor123, or nurse/nurse123"

**Production:**
- "Invalid credentials. Please check your username and password."

### Authentication Logic
**Development:**
- Demo credentials checked first
- Falls back to backend API

**Production:**
- Only backend API authentication
- No demo credential bypass

## Security Benefits

1. **No Credential Exposure**: Production users cannot see or use test credentials
2. **Professional Appearance**: Clean login interface for end users
3. **Selective Access**: Developers can enable demo mode locally as needed
4. **Environment-Based**: Automatic detection based on build mode

## Developer Access

As a developer, you can:

1. **Local Development**: Demo credentials work automatically with `npm run dev`
2. **Manual Override**: Set `VITE_SHOW_DEMO_CREDENTIALS=true` in your `.env`
3. **Testing Builds**: Build with the flag to test production-like behavior locally

## Verification

To verify demo credentials are hidden:

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Try to login - demo credentials section should be hidden
```

## Best Practices

✅ **DO:**
- Keep `VITE_SHOW_DEMO_CREDENTIALS=true` in `.env.example` for developer reference
- Use demo credentials for local testing and development
- Document this feature in onboarding materials

❌ **DON'T:**
- Set `VITE_SHOW_DEMO_CREDENTIALS=true` in production environments
- Commit `.env` file with real credentials
- Share demo credentials in public documentation

## Production Deployment Checklist

- [ ] Verify `VITE_SHOW_DEMO_CREDENTIALS` is not set in Heroku config vars
- [ ] Test production build locally with `npm run build && npm run preview`
- [ ] Confirm demo credentials section is hidden in login screen
- [ ] Verify only "Request Medical Staff Access" option is visible
- [ ] Test that demo credentials don't work in production

---

**Last Updated:** 2025-10-22  
**Security Level:** Production-Ready ✅
