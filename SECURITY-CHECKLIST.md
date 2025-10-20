# 🔐 Security Incident Response Checklist

## GitGuardian SMTP Credential Exposure - Action Items

### ✅ Completed Actions
- [x] Identified exposed credentials in codebase
- [x] Removed hardcoded credentials from source files
- [x] Replaced with environment variables
- [x] Created secure .env template
- [x] Verified .gitignore includes .env files
- [x] Committed security fixes

### 🚨 URGENT - Actions Required Immediately

#### 1. Rotate Gmail App Password
- [ ] Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
- [ ] Revoke the current app password: `mzjs uguw sftc jpvl`
- [ ] Generate a new app password
- [ ] Update your local `.env` file with the new password
- [ ] Test email functionality with new credentials

#### 2. Clean Git History
Choose one method from `clean-git-history.txt`:
- [ ] Option 1: Use git filter-repo (recommended)
- [ ] Option 2: Use BFG Repo-Cleaner  
- [ ] Option 3: Manual git filter-branch
- [ ] Force push cleaned history to GitHub
- [ ] Verify credentials no longer appear in GitHub history

#### 3. Update Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Replace placeholder values with your actual credentials:
  ```
  EMAIL_USER=your-actual-email@gmail.com
  EMAIL_PASS=your-new-app-password
  EMAIL_FROM_ADDRESS=your-actual-email@gmail.com
  PHONE_NUMBER=your-phone-number
  ```
- [ ] Test all notification functionality

#### 4. Security Verification
- [ ] Scan repository with GitGuardian again
- [ ] Verify no credentials in GitHub commit history
- [ ] Confirm `.env` file is not committed
- [ ] Test that application still works with env variables

#### 5. Document and Prevent
- [ ] Add security note to README
- [ ] Set up pre-commit hooks to scan for secrets (optional)
- [ ] Train team on secure credential management

### 📧 Gmail Security Settings
After rotating the app password, also consider:
- [ ] Review recent login activity
- [ ] Enable login alerts if not already active
- [ ] Consider using OAuth2 instead of app passwords (future improvement)

### 🔍 Files That Were Compromised
- `server/test-email.cjs` - ✅ Fixed
- `server/test-email-quick.js` - ✅ Fixed
- Git history commits - ⚠️ Needs cleaning

### 💡 Security Best Practices Going Forward
1. Always use environment variables for credentials
2. Never commit `.env` files
3. Use `.env.example` templates for documentation
4. Regular security scanning with tools like GitGuardian
5. Consider using secret management services for production

## Emergency Contacts
- GitGuardian Support: If you need help resolving the alert
- Google Security: If you suspect account compromise

---
**Priority**: 🔴 CRITICAL - Complete within 24 hours
**Impact**: Exposed SMTP credentials could allow unauthorized email access