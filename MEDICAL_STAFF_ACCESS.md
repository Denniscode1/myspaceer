# Secure Medical Staff Access System

## Overview

The MySpaceER system now provides a secure, email-based credential system for medical staff access instead of displaying hardcoded passwords on the login form. This system ensures that only verified medical professionals can access the emergency response dashboard.

## 🔐 How It Works

### For Medical Staff (Doctors & Nurses):

1. **Visit the Homepage**: Go to the MySpaceER form page
2. **Click "Medical Staff Access"**: Found at the bottom of the form
3. **Request Credentials**: Click "📧 Request Medical Staff Access" instead of seeing hardcoded passwords
4. **Fill Out Verification Form**: Provide professional information including:
   - Professional email address
   - Full name
   - Role (Doctor, Nurse, Resident, Specialist)
   - Hospital/clinic affiliation
   - Medical license number
   - Department (optional)
5. **Receive Credentials**: Check your email for secure login credentials within 5 minutes
6. **Login**: Use the provided username and password to access the dashboard

### Security Features:

- ✅ **No Hardcoded Credentials**: Passwords are no longer visible on the login form
- ✅ **Email Verification**: Credentials sent only to verified professional email addresses
- ✅ **Rate Limiting**: Maximum 3 requests per email per 24 hours
- ✅ **Credential Expiry**: All credentials expire after 24 hours for security
- ✅ **Secure Password Generation**: 12-character passwords with mixed case, numbers, and symbols
- ✅ **Professional Verification**: Medical license numbers and hospital affiliations are recorded
- ✅ **Request Tracking**: All access requests are logged and tracked

## 🚀 API Endpoints

### Request Access Credentials
```http
POST /api/medical-staff/request-access
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "role": "doctor",
  "firstName": "John",
  "lastName": "Smith", 
  "hospitalAffiliation": "Kingston Public Hospital",
  "medicalLicense": "MD123456",
  "department": "Emergency Medicine"
}
```

### Validate Login Credentials
```http
POST /api/medical-staff/validate-login
Content-Type: application/json

{
  "username": "johns_doctor1234",
  "password": "SecurePass123!",
  "role": "doctor"
}
```

## 📧 Email Template

When medical staff request access, they receive a professional email containing:

- **Secure Credentials**: Username and password prominently displayed
- **Security Information**: Expiration time, security best practices
- **Login Instructions**: Step-by-step guide to access the dashboard
- **Professional Verification**: Confirmation of their submitted information
- **Direct Access Link**: Button to access the dashboard immediately

## 🔧 Configuration

### Environment Variables
Ensure your `.env` file contains:

```bash
# Email Configuration (for sending credentials)
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_FROM_ADDRESS=your.email@gmail.com
EMAIL_FROM_NAME=MySpaceER Emergency System

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Database Tables

The system automatically creates these tables:

```sql
-- Medical staff access requests
CREATE TABLE medical_staff_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  hospital_affiliation TEXT NOT NULL,
  medical_license TEXT NOT NULL,
  department TEXT,
  request_ip TEXT,
  status TEXT DEFAULT 'pending',
  username TEXT,
  password_hash TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  last_login DATETIME
);

-- Session tracking (future enhancement)
CREATE TABLE medical_staff_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT
);
```

## 📊 Admin Functions

### View Active Credentials
```http
GET /api/medical-staff/credentials
```

### View Statistics
```http
GET /api/medical-staff/stats
```

### Example Response:
```json
{
  "success": true,
  "data": [
    {
      "username": "johns_doctor1234",
      "role": "doctor",
      "first_name": "John",
      "last_name": "Smith",
      "hospital_affiliation": "Kingston Public Hospital",
      "email": "doctor@hospital.com",
      "created_at": "2024-01-20T10:30:00.000Z",
      "expires_at": "2024-01-21T10:30:00.000Z",
      "last_login": "2024-01-20T11:15:00.000Z"
    }
  ],
  "count": 1
}
```

## 🔒 Security Considerations

### Password Security
- Passwords are hashed using SHA-256 before storage
- Original passwords are only displayed in the email and never stored in plain text
- Passwords contain at least one: uppercase, lowercase, number, and symbol

### Rate Limiting
- Maximum 3 access requests per email per 24 hours
- Simple IP-based rate limiting on sensitive endpoints
- Failed login attempts are tracked

### Data Protection
- Medical license numbers and personal information are encrypted in storage
- All requests include IP tracking for audit purposes
- Expired credentials are automatically cleaned up

## 🛠️ Troubleshooting

### Common Issues:

**"Email not received"**
- Check spam/junk folder
- Verify professional email address is correct
- Ensure SMTP configuration is working

**"Invalid credentials or access expired"**
- Credentials expire after 24 hours
- Request new credentials if expired
- Verify username/password exactly as provided in email

**"Too many requests"**
- Wait 24 hours before requesting again
- Contact admin if legitimate need for more requests

### Testing Email Setup:
```bash
# Test your email configuration
node server/setup-email.js
```

### View Logs:
```bash
# Check server logs for credential requests
tail -f server/logs/medical-staff.log
```

## 🚀 Future Enhancements

- [ ] **Multi-Factor Authentication**: SMS or app-based 2FA
- [ ] **Single Sign-On (SSO)**: Integration with hospital authentication systems
- [ ] **Role-Based Permissions**: Different access levels for different medical roles
- [ ] **Session Management**: Proper session tokens and logout functionality
- [ ] **Audit Trail**: Comprehensive logging of all medical staff actions
- [ ] **Mobile App Integration**: QR code access for mobile devices

## 📞 Support

For technical support or access issues:
- **Email**: support@myspaceer.com
- **Phone**: Contact your hospital's IT department
- **Documentation**: Check this README and system logs

---

**Security Notice**: This system handles sensitive medical and personal information. Always follow your institution's security protocols and never share login credentials.