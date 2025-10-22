# 👨‍⚕️ Medical Staff Management Guide

## How to Get Doctor/Nurse Information

---

## 📋 **3 Options for Getting Staff Data**

### **Option 1: Self-Registration (RECOMMENDED) ✅**

Doctors and nurses register themselves through your app/website.

**Advantages:**
- ✅ No manual data entry
- ✅ Staff control their own profiles
- ✅ Real-time availability updates
- ✅ Automatic shift management
- ✅ Scalable for any hospital size

**How it works:**
1. Doctor visits your website/app
2. Clicks "Register as Medical Staff"
3. Fills out registration form
4. Hospital admin verifies their credentials
5. Doctor can now manage their availability

---

### **Option 2: Hospital Admin Bulk Import**

Hospital administrator uploads staff list via CSV/Excel.

**Advantages:**
- ✅ Quick setup for existing staff
- ✅ Hospital maintains control
- ✅ Can import from existing systems

**How it works:**
1. Hospital exports staff list from their system
2. Admin uploads CSV to MySpaceER
3. System creates accounts for all staff
4. Staff receive login credentials via email

---

### **Option 3: Integration with Hospital Systems**

Connect to hospital's existing staff management system (HIS/HRIS).

**Advantages:**
- ✅ Always synchronized
- ✅ No duplicate data entry
- ✅ Enterprise-grade integration

**How it works:**
1. API connection to hospital's system
2. Real-time sync of staff data
3. Automatic updates when staff schedules change

---

## 🚀 **Quick Start - Staff Registration API**

### **1. Register a Doctor**

```bash
POST /api/staff/register

{
  "email": "dr.smith@hospital.com",
  "password": "SecurePassword123!",
  "name": "Dr. John Smith",
  "role": "doctor",
  "license_number": "MD-12345-JM",
  "specialties": ["emergency_medicine", "cardiology"],
  "hospital_id": "HOSP-001",
  "phone": "+1-876-555-1234",
  "emergency_contact": "+1-876-555-5678",
  "max_concurrent_patients": 5
}
```

**Response:**
```json
{
  "success": true,
  "staff_id": "DOCTOR-1729566489-ABC123",
  "message": "Staff registered successfully. Pending verification."
}
```

---

### **2. Staff Login**

```bash
POST /api/staff/login

{
  "email": "dr.smith@hospital.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "staff": {
    "id": "DOCTOR-1729566489-ABC123",
    "name": "Dr. John Smith",
    "email": "dr.smith@hospital.com",
    "role": "doctor",
    "hospital_id": "HOSP-001",
    "specialties": ["emergency_medicine", "cardiology"],
    "is_verified": false
  }
}
```

---

### **3. Update Shift Schedule**

```bash
PUT /api/staff/DOCTOR-1729566489-ABC123/shift

{
  "shift_start": "08:00",
  "shift_end": "20:00",
  "max_concurrent_patients": 5
}
```

---

### **4. Toggle Availability (On/Off Duty)**

```bash
PUT /api/staff/DOCTOR-1729566489-ABC123/availability

{
  "is_available": true
}
```

---

### **5. Verify Staff (Admin Only)**

```bash
PUT /api/staff/DOCTOR-1729566489-ABC123/verify

{
  "verified_by": "ADMIN-001"
}
```

---

### **6. Get All Hospital Staff**

```bash
GET /api/staff/hospital/HOSP-001?role=doctor
```

**Response:**
```json
{
  "success": true,
  "staff": [
    {
      "staff_id": "DOCTOR-001",
      "name": "Dr. John Smith",
      "email": "dr.smith@hospital.com",
      "role": "doctor",
      "license_number": "MD-12345-JM",
      "specialties": ["emergency_medicine", "cardiology"],
      "phone": "+1-876-555-1234",
      "is_verified": true,
      "is_active": true
    }
  ]
}
```

---

## 🏥 **Specialty Types Available**

### **Primary Specialties:**
- `emergency_medicine` - ER doctors
- `critical_care` - ICU specialists
- `trauma` - Trauma surgeons
- `surgery` - General surgeons
- `cardiology` - Heart specialists
- `neurology` - Brain/nerve specialists
- `orthopedics` - Bone/joint specialists
- `pediatrics` - Children's doctors
- `obstetrics` - Pregnancy/birth
- `gynecology` - Women's health
- `psychiatry` - Mental health
- `internal_medicine` - General medicine

### **Sub-Specialties:**
- `burn_care` - Burn treatment
- `plastic_surgery` - Reconstructive surgery
- `toxicology` - Poison/overdose
- `pulmonology` - Lung specialists
- `gastroenterology` - Digestive system
- `allergy_immunology` - Allergies
- `geriatrics` - Elderly care

---

## 📊 **Staff Verification Workflow**

```
Doctor Registers
       ↓
Status: PENDING
       ↓
Hospital Admin Reviews:
- License number
- Credentials
- Specialties
       ↓
Admin Verifies
       ↓
Status: VERIFIED
       ↓
Doctor Can Now:
- Accept patient assignments
- View full patient records
- Update availability
```

---

## 🔐 **Security Features**

1. **Password Hashing:** bcrypt with salt rounds
2. **JWT Tokens:** 8-hour expiration (shift duration)
3. **License Verification:** Required for all medical staff
4. **Admin Approval:** Manual verification step
5. **Audit Logging:** All staff actions logged

---

## 💡 **Use Cases**

### **Use Case 1: New Hospital Onboarding**

**Scenario:** Kingston Public Hospital wants to join MySpaceER

**Steps:**
1. Hospital admin creates hospital profile
2. Admin uploads 50 doctors via CSV import
3. System creates accounts and emails credentials
4. Doctors log in and set their shift schedules
5. Doctors toggle "Available" when on duty
6. System automatically assigns patients based on ESI level

**Result:** Hospital operational in < 1 day

---

### **Use Case 2: Individual Doctor Registration**

**Scenario:** Dr. Jane Doe joins University Hospital ER

**Steps:**
1. Dr. Doe visits MySpaceER website
2. Clicks "Join as Doctor"
3. Fills registration form with license MD-67890-JM
4. Hospital admin verifies credentials
5. Dr. Doe sets schedule: Mon-Fri 7am-7pm
6. Marks herself "Available"
7. System assigns first patient in 5 minutes

**Result:** Doctor onboarded in < 30 minutes

---

### **Use Case 3: Shift Changes**

**Scenario:** Dr. Smith needs to leave early due to emergency

**Steps:**
1. Dr. Smith opens MySpaceER app
2. Clicks "Go Off Duty"
3. System marks `is_available = false`
4. System stops assigning new patients
5. Current patients reassigned to other doctors
6. System logs the shift change

**Result:** Seamless shift transition

---

## 📱 **Frontend Integration**

### **Registration Form Example:**

```javascript
const registerDoctor = async (formData) => {
  const response = await fetch('/api/staff/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: 'doctor',
      license_number: formData.license,
      specialties: formData.specialties, // ["emergency_medicine", "cardiology"]
      hospital_id: formData.hospital,
      phone: formData.phone,
      emergency_contact: formData.emergencyContact,
      max_concurrent_patients: 5
    })
  });
  
  return await response.json();
};
```

---

## 🔄 **Automatic Assignment Flow**

When patient arrives:

```
Patient Report Created
         ↓
ESI Triage: Level 2 (Emergent)
         ↓
Find Available Doctors at Hospital
         ↓
Filter: Only doctors currently "Available"
         ↓
Score Doctors:
  - Dr. Smith (Cardiology) → Score: 185
  - Dr. Jones (Emergency Med) → Score: 165
         ↓
Assign Dr. Smith (Best Match)
         ↓
Update: current_patient_count = 4
         ↓
Notify Dr. Smith via SMS/Push
         ↓
Update Patient Status: "Assigned"
```

---

## 🎯 **Best Practices**

### **For Hospitals:**
1. ✅ Verify all staff credentials before approval
2. ✅ Set realistic `max_concurrent_patients` (4-6 typical)
3. ✅ Encourage doctors to update availability in real-time
4. ✅ Review assignment statistics weekly

### **For Doctors:**
1. ✅ Keep availability status current
2. ✅ Update specialties if you gain new certifications
3. ✅ Set accurate shift times
4. ✅ Mark yourself unavailable during breaks

### **For System Admins:**
1. ✅ Regular backup of staff database
2. ✅ Monitor assignment algorithm performance
3. ✅ Review verification queue daily
4. ✅ Audit staff access logs monthly

---

## 📊 **Database Tables Used**

### **medical_staff table:**
- `staff_id` - Unique ID (DOCTOR-timestamp-random)
- `name` - Full name
- `email` - Login email
- `password_hash` - bcrypt hash
- `role` - 'doctor' or 'nurse'
- `license_number` - Medical license
- `specialties` - JSON array
- `hospital_id` - Associated hospital
- `is_verified` - Admin approved?
- `is_active` - Account active?

### **doctor_shifts table:**
- `doctor_id` - Links to medical_staff
- `shift_start` - e.g., "08:00"
- `shift_end` - e.g., "20:00"
- `max_concurrent_patients` - Capacity
- `current_patient_count` - Active patients
- `is_available` - Currently on duty?

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: No doctors available**
**Problem:** All doctors at capacity  
**Solution:** System queues patient, notifies when doctor available

### **Issue 2: Wrong specialty assigned**
**Problem:** Cardiologist assigned to orthopedic case  
**Solution:** Assignment algorithm considers incident type, will assign ER doctor if no orthopedist available

### **Issue 3: Doctor forgot to go off duty**
**Problem:** Receiving assignments after shift ended  
**Solution:** Implement auto-logout after shift_end time

---

## 💰 **Cost Considerations**

| Approach | Setup Time | Monthly Cost | Maintenance |
|----------|------------|--------------|-------------|
| **Self-Registration** | 1 day | $0 | Low |
| **Bulk Import** | 1 week | $0 | Medium |
| **Hospital Integration** | 1-3 months | $500-2000 | High |

**Recommendation:** Start with self-registration, add integrations later.

---

## 📞 **Support**

For hospitals wanting to onboard:
1. Contact: support@myspaceer.com
2. Provide: Hospital name, number of doctors, specialties
3. Receive: Admin account + onboarding guide
4. Timeline: Operational in 24-48 hours

---

## ✅ **Checklist for Going Live**

- [ ] Hospital admin account created
- [ ] At least 3 doctors registered per shift
- [ ] All doctors verified by admin
- [ ] Shift schedules configured
- [ ] Doctors marked "Available"
- [ ] Test assignment with dummy patient
- [ ] Monitor first 10 assignments
- [ ] Gather doctor feedback
- [ ] Optimize max_concurrent_patients

---

**Your staff management system is ready to use! 🎉**

Start by registering a test doctor and trying the assignment flow.
