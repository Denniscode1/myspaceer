# MySpaceER - Emergency Response System

**Powered by MedSenseAI**

MySpaceER is an intelligent emergency response system designed for hospitals and medical facilities in Jamaica. The system automates patient triage, queue management, and resource allocation using **MedSenseAI** - our advanced AI-powered analysis engine.

## 🚨 System Overview

This enhanced emergency triage system implements a complete emergency workflow with AI-powered decision making, real-time hospital selection, queue management, and automated notifications.

## ✅ Key Features

### Core Emergency Response
- **MedSenseAI Triage Engine**: Intelligent patient classification and priority assignment
- **Smart Queue Management**: Automated patient routing to optimal hospitals
- **Real-time Notifications**: Email, SMS, and push notifications for patients and staff
- **Mobile-responsive Design**: Works on all devices

### Advanced Location & Hospital Selection
- **GPS-Accurate Location Detection**: High-precision location services using HTML5 Geolocation API
- **26 Jamaica Hospitals**: Complete coverage of all parishes with GPS coordinates
- **Intelligent Hospital Ranking**: Multi-factor scoring based on distance, travel time, capacity, and specialties
- **Dynamic Travel Time Estimation**: Transportation mode-aware calculations (ambulance, car, taxi, etc.)

### Medical Staff Access
- **Secure Credential System**: Email-based authentication for medical professionals
- **Professional Verification**: Medical license and hospital affiliation verification
- **Time-limited Access**: 24-hour credential expiration for security
- **Rate-Limited Requests**: Maximum 3 requests per email per day

## 🏥 Hospital Coverage

**26 hospitals across Jamaica:**
- **Kingston Metro**: 7 hospitals including Kingston Public, UWI Hospital, Bustamante Children's
- **St. Catherine**: 3 hospitals including Spanish Town Hospital
- **St. James**: Cornwall Regional, Montego Bay Community
- **Manchester**: Mandeville Regional, Hargreaves Memorial
- **All Other Parishes**: Complete coverage with specialized facilities

## 🔧 Technology Stack

- **Frontend**: React + Vite with GPS location services
- **Backend**: Node.js + Express with enhanced APIs
- **Database**: SQLite3 with comprehensive hospital data (PostgreSQL ready for production)
- **AI Engine**: MedSenseAI (Custom rule-based + ML classifier)
- **Location Services**: HTML5 Geolocation API with Haversine distance calculations
- **Security**: AES-256-GCM encryption, SHA-256 hashing, immutable audit logs, rate limiting
- **Compliance**: HIPAA-ready with audit trails, consent management, data versioning

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Modern browser with geolocation support
- HTTPS for high-accuracy GPS (production)

### Installation
```bash
# Install dependencies
npm install
cd server && npm install

# Populate hospital database (if not already done)
node server/populate-jamaica-hospitals.js

# Start the backend
cd server
node server-enhanced.js
# or: npm run dev

# Start the frontend (in another terminal)
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🧠 MedSenseAI Triage Features

### Deterministic Rules (Priority Order)
1. **Shooting + Unconscious** → Severe
2. **Stabbing + Unconscious** → Severe
3. **Motor Vehicle Accident + Age 51+ + Ambulance** → High
4. **Keyword Detection** → Based on incident description analysis

### ML Classifier Features
- **Incident Severity Score** (25% weight)
- **Consciousness Level** (20% weight)
- **Age Risk Factor** (15% weight)
- **Transportation Urgency** (15% weight)
- **Text Analysis** (15% weight)
- **Time of Day Risk** (10% weight)

### Hospital Selection Algorithm
- **Travel Time** (Critical factor for severe cases)
- **Specialty Matching** (ICU, Trauma, Surgery availability)
- **Hospital Capacity** (Current load vs. capacity)
- **Distance Optimization** (Haversine formula calculations)

## 📱 User Experience

### For Patients/EMTs
1. **Location Detection**: Automatic GPS location with Jamaica boundary detection
2. **Smart Hospital Selection**: AI recommends optimal hospital based on condition and location
3. **Real-time Updates**: Queue position and estimated wait times
4. **Privacy Protection**: Location data used only for calculations, never stored

### For Medical Staff
1. **Secure Access**: Request credentials via professional email
2. **Dashboard Access**: Comprehensive patient management interface
3. **Real-time Queue**: Live patient queue with triage information
4. **Professional Verification**: Medical license and hospital affiliation required

## 🔐 Security & Privacy

- **Location Privacy**: GPS coordinates never stored, used only for real-time calculations
- **Credential Security**: 24-hour expiration, SHA-256 hashing, rate limiting
- **Data Protection**: Medical information handled according to healthcare privacy standards
- **Professional Verification**: Medical license numbers and hospital affiliations verified

## 📊 Performance Metrics

- **Hospital Query Time**: <10ms for all 26 hospitals
- **Location Accuracy**: ±5-100m depending on GPS conditions
- **API Response Times**: 15-150ms depending on complexity
- **Triage Processing**: Real-time analysis with confidence scoring

---

## 🏥 Medical Market Deployment

### ⚠️ Important: Medical Market Enhancements Available

We've conducted a comprehensive audit for medical market deployment and created:

1. **📝 MEDICAL_MARKET_AUDIT.md** - Complete analysis of 57 issues across:
   - HIPAA/Data Privacy Compliance
   - Clinical Safety & Validation
   - Audit Trails & Logging
   - Production Infrastructure
   - Error Handling & Validation
   - Notification Systems

2. **🚀 IMPLEMENTATION_GUIDE.md** - Step-by-step guide to implement:
   - AES-256-GCM encryption for sensitive data
   - Immutable audit logging with blockchain-style hash chains
   - Consent management and data versioning
   - Clinical vital signs tracking
   - MFA preparation for medical staff

### 🛠️ Phase 1: Quick Start (Implemented)

```powershell
# 1. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Copy and update .env
Copy-Item .env.example .env
# Edit .env and add your ENCRYPTION_KEY

# 3. Run database migration
cd server
node run-migration.js

# 4. Start the system
npm start
```

### ✅ Current Status

- ✅ **Encryption Service** - AES-256-GCM for TRN, contact info
- ✅ **Audit Service** - Immutable logging with hash chains
- ✅ **Database Schema** - HIPAA compliance fields added
- ✅ **Consent Management** - Ready for patient consent tracking
- ✅ **Clinical Fields** - Vital signs, allergies, medications
- 🚧 **Input Validation** - Joi schemas (Phase 2)
- 🚧 **ESI Triage** - Clinical validation (Phase 2)
- 🚧 **Testing Suite** - Unit/integration tests (Phase 3)

**Estimated Timeline to Full Deployment:** 4-6 weeks  
**Estimated Investment:** $111,420 (including infrastructure)

See **IMPLEMENTATION_GUIDE.md** for detailed next steps.
